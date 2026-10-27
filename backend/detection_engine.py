import json
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import Event, DetectionRule, Alert, LogSource

# Default initial rules
DEFAULT_RULES = [
    {
        "id": "RULE-001",
        "name": "Repeated Failed Logins",
        "description": "Detects repeated failed authentication attempts (Event ID 4625) within a configurable time window from the same source IP or targeting the same account, indicating possible brute force activity.",
        "severity": "Medium",
        "is_enabled": True,
        "rule_type": "failed_logins",
        "threshold": 5,
        "time_window_seconds": 300,
        "group_by": "source_ip",
        "conditions": {
            "event_ids": [4625],
            "categories": ["Authentication"]
        }
    },
    {
        "id": "RULE-002",
        "name": "Successful Login After Repeated Failures",
        "description": "Identifies a successful logon (Event ID 4624) immediately following multiple failed logon attempts within a short interval, indicating potential credential compromise or successful brute force attack.",
        "severity": "High",
        "is_enabled": True,
        "rule_type": "login_after_failures",
        "threshold": 3,  # 3 failures before the success
        "time_window_seconds": 600,
        "group_by": "username",
        "conditions": {
            "failure_event_id": 4625,
            "success_event_id": 4624
        }
    },
    {
        "id": "RULE-003",
        "name": "Account Lockout Spike",
        "description": "Detects rapid account lockout events (Event ID 4740) across the domain or targeted endpoints, signaling an aggressive credential guessing attack triggering security lockout policies.",
        "severity": "Medium",
        "is_enabled": True,
        "rule_type": "account_lockout",
        "threshold": 2,
        "time_window_seconds": 600,
        "group_by": "account",
        "conditions": {
            "event_ids": [4740],
            "categories": ["Account Management"]
        }
    },
    {
        "id": "RULE-004",
        "name": "Suspicious PowerShell Activity",
        "description": "Detects process creation events (Event ID 4688) containing high-risk command-line switches like EncodedCommand, DownloadString, ExecutionPolicy Bypass, or In-Memory Script Execution.",
        "severity": "High",
        "is_enabled": True,
        "rule_type": "suspicious_powershell",
        "threshold": 1,
        "time_window_seconds": 60,
        "group_by": "host",
        "conditions": {
            "event_ids": [4688],
            "process_names": ["powershell.exe", "pwsh.exe"],
            "command_line_patterns": [
                "-enc", "-encodedcommand", "downloadstring", "invoke-expression",
                "iex", "bypass", "-w hidden", "mimikatz", "webclient", "bitstransfer"
            ]
        }
    },
    {
        "id": "RULE-005",
        "name": "Unusual Privileged Account Activity",
        "description": "Detects sensitive security actions (Event ID 4672 Special Privileges Assigned, or admin logon) by designated privileged accounts (e.g. Administrator, root, Domain Admin). Flags for verification.",
        "severity": "Low",
        "is_enabled": True,
        "rule_type": "privileged_activity",
        "threshold": 1,
        "time_window_seconds": 60,
        "group_by": "account",
        "conditions": {
            "event_ids": [4672, 4624],
            "privileged_users": ["administrator", "root", "krbtgt", "sec_admin", "svc_domainadmin"]
        }
    },
    {
        "id": "RULE-006",
        "name": "Multiple Accounts Targeted From One IP",
        "description": "Detects multiple distinct usernames targeted with failed logins from a single external or internal IP address within a configurable window, indicating a password-spraying campaign.",
        "severity": "High",
        "is_enabled": True,
        "rule_type": "multiple_accounts_one_ip",
        "threshold": 3,  # 3 distinct usernames
        "time_window_seconds": 300,
        "group_by": "source_ip",
        "conditions": {
            "event_ids": [4625],
            "categories": ["Authentication"]
        }
    }
]

def init_default_rules(db: Session):
    """Seed default detection rules if none exist"""
    for rule_data in DEFAULT_RULES:
        existing = db.query(DetectionRule).filter(DetectionRule.id == rule_data["id"]).first()
        if not existing:
            new_rule = DetectionRule(
                id=rule_data["id"],
                name=rule_data["name"],
                description=rule_data["description"],
                severity=rule_data["severity"],
                is_enabled=rule_data["is_enabled"],
                rule_type=rule_data["rule_type"],
                threshold=rule_data["threshold"],
                time_window_seconds=rule_data["time_window_seconds"],
                group_by=rule_data["group_by"],
                conditions=json.dumps(rule_data["conditions"]),
                alerts_count=0
            )
            db.add(new_rule)
    db.commit()

class DetectionEngine:
    def __init__(self, db: Session):
        self.db = db

    def evaluate_all(self, recent_event_ids: Optional[List[str]] = None) -> List[Alert]:
        """
        Evaluate all enabled rules against current events in database.
        Returns newly generated alerts.
        """
        rules = self.db.query(DetectionRule).filter(DetectionRule.is_enabled == True).all()
        generated_alerts: List[Alert] = []

        for rule in rules:
            new_alerts = self.evaluate_rule(rule)
            generated_alerts.extend(new_alerts)

        return generated_alerts

    def evaluate_rule(self, rule: DetectionRule, sample_events: Optional[List[Event]] = None) -> List[Alert]:
        """
        Evaluates a specific rule against database events or sample events.
        """
        if not rule.is_enabled and sample_events is None:
            return []

        conditions = json.loads(rule.conditions) if isinstance(rule.conditions, str) else rule.conditions
        window = timedelta(seconds=rule.time_window_seconds)

        if sample_events is not None:
            events = sample_events
        else:
            # Look at events within recent window plus some margin for processing
            now = datetime.utcnow()
            cutoff = now - timedelta(seconds=max(rule.time_window_seconds * 3, 3600))
            events = self.db.query(Event).filter(Event.timestamp >= cutoff).order_by(Event.timestamp.asc()).all()

        generated: List[Alert] = []

        if rule.rule_type == "failed_logins":
            generated = self._eval_failed_logins(rule, conditions, window, events, sample_mode=(sample_events is not None))
        elif rule.rule_type == "login_after_failures":
            generated = self._eval_login_after_failures(rule, conditions, window, events, sample_mode=(sample_events is not None))
        elif rule.rule_type == "account_lockout":
            generated = self._eval_account_lockout(rule, conditions, window, events, sample_mode=(sample_events is not None))
        elif rule.rule_type == "suspicious_powershell":
            generated = self._eval_suspicious_powershell(rule, conditions, events, sample_mode=(sample_events is not None))
        elif rule.rule_type == "privileged_activity":
            generated = self._eval_privileged_activity(rule, conditions, events, sample_mode=(sample_events is not None))
        elif rule.rule_type == "multiple_accounts_one_ip":
            generated = self._eval_multiple_accounts_one_ip(rule, conditions, window, events, sample_mode=(sample_events is not None))
        elif rule.rule_type == "custom":
            generated = self._eval_custom_rule(rule, conditions, window, events, sample_mode=(sample_events is not None))

        return generated

    def _eval_failed_logins(self, rule: DetectionRule, conditions: Dict, window: timedelta, events: List[Event], sample_mode: bool) -> List[Alert]:
        alerts = []
        matching_events = [
            e for e in events
            if e.event_id == 4625 or (e.event_category == "Authentication" and "failed" in e.description.lower())
        ]

        # Group by criteria
        grouped: Dict[str, List[Event]] = {}
        for e in matching_events:
            if rule.group_by == "account":
                key = (e.username or "unknown").lower()
            elif rule.group_by == "both":
                key = f"{(e.username or 'unknown').lower()}@{(e.source_ip or 'unknown')}"
            else:  # source_ip default
                key = e.source_ip or "unknown"
            
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(e)

        for key, evts in grouped.items():
            evts_sorted = sorted(evts, key=lambda x: x.timestamp)
            for i in range(len(evts_sorted)):
                sub = [evts_sorted[i]]
                for j in range(i + 1, len(evts_sorted)):
                    if evts_sorted[j].timestamp - evts_sorted[i].timestamp <= window:
                        sub.append(evts_sorted[j])
                
                if len(sub) >= rule.threshold:
                    alert = self._create_or_dedup_alert(
                        rule=rule,
                        title=f"Potential Brute Force: {len(sub)} Failed Logins on {key}",
                        summary=f"Detection rule observed {len(sub)} failed authentication attempts within {rule.time_window_seconds}s for target '{key}', exceeding configured threshold of {rule.threshold}.",
                        target_account=sub[0].username,
                        source_ip=sub[0].source_ip,
                        hostname=sub[0].hostname,
                        evidence_events=sub,
                        sample_mode=sample_mode
                    )
                    if alert:
                        alerts.append(alert)
                    break # Alert for this group created, move to next group
        return alerts

    def _eval_login_after_failures(self, rule: DetectionRule, conditions: Dict, window: timedelta, events: List[Event], sample_mode: bool) -> List[Alert]:
        alerts = []
        # Find successful logins (4624)
        successes = [e for e in events if e.event_id == 4624 or "successful" in e.description.lower()]

        for s in successes:
            user = (s.username or "").lower()
            ip = s.source_ip
            if not user and not ip:
                continue

            # Find failures within window before this success
            start_time = s.timestamp - window
            failures = [
                e for e in events
                if (e.event_id == 4625 or "failed" in e.description.lower())
                and start_time <= e.timestamp <= s.timestamp
                and ((rule.group_by == "source_ip" and e.source_ip == ip) or (rule.group_by != "source_ip" and (e.username or "").lower() == user))
            ]

            if len(failures) >= rule.threshold:
                evidence = failures + [s]
                alert = self._create_or_dedup_alert(
                    rule=rule,
                    title=f"Suspicious Logon After {len(failures)} Failures: {user or ip}",
                    summary=f"Successful logon observed for account '{user or 'unknown'}' from IP '{ip or 'unknown'}' immediately preceded by {len(failures)} failed attempts within {rule.time_window_seconds} seconds.",
                    target_account=user,
                    source_ip=ip,
                    hostname=s.hostname,
                    evidence_events=evidence,
                    sample_mode=sample_mode
                )
                if alert:
                    alerts.append(alert)
        return alerts

    def _eval_account_lockout(self, rule: DetectionRule, conditions: Dict, window: timedelta, events: List[Event], sample_mode: bool) -> List[Alert]:
        alerts = []
        lockouts = [e for e in events if e.event_id == 4740 or "lockout" in e.description.lower()]

        grouped: Dict[str, List[Event]] = {}
        for e in lockouts:
            key = (e.username or e.hostname or "domain").lower()
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(e)

        for key, evts in grouped.items():
            if len(evts) >= rule.threshold:
                alert = self._create_or_dedup_alert(
                    rule=rule,
                    title=f"Account Lockout Spike Detected: {key}",
                    summary=f"Observed {len(evts)} account lockout events (Event ID 4740) for '{key}' exceeding the threshold of {rule.threshold}.",
                    target_account=evts[0].username,
                    source_ip=evts[0].source_ip,
                    hostname=evts[0].hostname,
                    evidence_events=evts,
                    sample_mode=sample_mode
                )
                if alert:
                    alerts.append(alert)
        return alerts

    def _eval_suspicious_powershell(self, rule: DetectionRule, conditions: Dict, events: List[Event], sample_mode: bool) -> List[Alert]:
        alerts = []
        patterns = [p.lower() for p in conditions.get("command_line_patterns", ["-enc", "downloadstring", "invoke-expression"])]

        for e in events:
            # Check event ID 4688 or raw data command line
            is_proc = (e.event_id == 4688) or ("process" in e.event_category.lower())
            raw = {}
            if e.raw_data:
                try:
                    raw = json.loads(e.raw_data) if isinstance(e.raw_data, str) else e.raw_data
                except Exception:
                    raw = {}

            cmd = raw.get("CommandLine", "") or raw.get("command_line", "") or e.description
            cmd_lower = cmd.lower()

            if is_proc or "powershell" in cmd_lower:
                matched_patterns = [p for p in patterns if p in cmd_lower]
                if matched_patterns:
                    alert = self._create_or_dedup_alert(
                        rule=rule,
                        title=f"Suspicious PowerShell Command Pattern: {e.hostname or 'Host'}",
                        summary=f"Process creation detected containing suspicious parameters: {', '.join(matched_patterns)}. Command: '{cmd[:150]}...'",
                        target_account=e.username,
                        source_ip=e.source_ip,
                        hostname=e.hostname,
                        evidence_events=[e],
                        sample_mode=sample_mode
                    )
                    if alert:
                        alerts.append(alert)
        return alerts

    def _eval_privileged_activity(self, rule: DetectionRule, conditions: Dict, events: List[Event], sample_mode: bool) -> List[Alert]:
        alerts = []
        priv_users = [u.lower() for u in conditions.get("privileged_users", ["administrator", "root"])]

        for e in events:
            user = (e.username or "").lower()
            if any(p in user for p in priv_users) and (e.event_id in [4672, 4624] or "privilege" in e.event_category.lower()):
                alert = self._create_or_dedup_alert(
                    rule=rule,
                    title=f"Unusual Privileged Activity: {e.username}",
                    summary=f"Designated privileged account '{e.username}' performed sensitive action '{e.description}' on host '{e.hostname}'. Anomaly indicator flagged for security verification.",
                    target_account=e.username,
                    source_ip=e.source_ip,
                    hostname=e.hostname,
                    evidence_events=[e],
                    sample_mode=sample_mode
                )
                if alert:
                    alerts.append(alert)
        return alerts

    def _eval_multiple_accounts_one_ip(self, rule: DetectionRule, conditions: Dict, window: timedelta, events: List[Event], sample_mode: bool) -> List[Alert]:
        alerts = []
        matching = [e for e in events if e.event_id == 4625 and e.source_ip]

        by_ip: Dict[str, List[Event]] = {}
        for e in matching:
            if e.source_ip not in by_ip:
                by_ip[e.source_ip] = []
            by_ip[e.source_ip].append(e)

        for ip, evts in by_ip.items():
            evts_sorted = sorted(evts, key=lambda x: x.timestamp)
            for i in range(len(evts_sorted)):
                sub = [evts_sorted[i]]
                for j in range(i + 1, len(evts_sorted)):
                    if evts_sorted[j].timestamp - evts_sorted[i].timestamp <= window:
                        sub.append(evts_sorted[j])
                
                distinct_users = set((e.username or "").lower() for e in sub if e.username)
                if len(distinct_users) >= rule.threshold:
                    alert = self._create_or_dedup_alert(
                        rule=rule,
                        title=f"Password Spraying Detected: {len(distinct_users)} Accounts from {ip}",
                        summary=f"Observed failed logons targeting {len(distinct_users)} distinct accounts ({', '.join(list(distinct_users)[:5])}) from single IP address {ip} within {rule.time_window_seconds}s.",
                        target_account=list(distinct_users)[0] if distinct_users else None,
                        source_ip=ip,
                        hostname=sub[0].hostname,
                        evidence_events=sub,
                        sample_mode=sample_mode
                    )
                    if alert:
                        alerts.append(alert)
                    break
        return alerts

    def _eval_custom_rule(self, rule: DetectionRule, conditions: Dict, window: timedelta, events: List[Event], sample_mode: bool) -> List[Alert]:
        alerts = []
        field = conditions.get("field", "event_category")
        match_value = str(conditions.get("value", "")).lower()

        matching = []
        for e in events:
            val = getattr(e, field, "") or ""
            if match_value in str(val).lower():
                matching.append(e)

        if len(matching) >= rule.threshold:
            alert = self._create_or_dedup_alert(
                rule=rule,
                title=f"Custom Rule Triggered: {rule.name}",
                summary=f"Matched {len(matching)} events meeting condition '{field} contains {match_value}', reaching threshold {rule.threshold}.",
                target_account=matching[0].username,
                source_ip=matching[0].source_ip,
                hostname=matching[0].hostname,
                evidence_events=matching,
                sample_mode=sample_mode
            )
            if alert:
                alerts.append(alert)
        return alerts

    def _create_or_dedup_alert(
        self,
        rule: DetectionRule,
        title: str,
        summary: str,
        target_account: Optional[str],
        source_ip: Optional[str],
        hostname: Optional[str],
        evidence_events: List[Event],
        sample_mode: bool
    ) -> Optional[Alert]:
        evidence_ids = [e.id for e in evidence_events if e.id]
        evidence_ids_json = json.dumps(sorted(evidence_ids))

        if sample_mode:
            # Return transient alert representation
            return Alert(
                id=f"ALT-SAMPLE-{uuid.uuid4().hex[:6].upper()}",
                title=title,
                severity=rule.severity,
                rule_id=rule.id,
                rule_name=rule.name,
                timestamp=datetime.utcnow(),
                target_account=target_account,
                source_ip=source_ip,
                hostname=hostname,
                status="New",
                summary=summary,
                evidence_event_ids=evidence_ids_json,
                assigned_to="Analyst Yashaswini",
                resolution_summary=""
            )

        # Check deduplication: existing alert with same rule_id and exact same evidence or overlapping evidence within 10 minutes
        ten_mins_ago = datetime.utcnow() - timedelta(minutes=10)
        existing_alerts = self.db.query(Alert).filter(
            Alert.rule_id == rule.id,
            Alert.timestamp >= ten_mins_ago
        ).all()

        for ea in existing_alerts:
            ea_evidence = json.loads(ea.evidence_event_ids) if ea.evidence_event_ids else []
            # If 70% or more evidence events already alerted on, deduplicate!
            intersection = set(evidence_ids).intersection(set(ea_evidence))
            if len(intersection) >= max(1, len(evidence_ids) * 0.7):
                return None  # Deduplicated!

        # Create new Alert
        alert_id = f"ALT-{datetime.utcnow().strftime('%y%m%d')}-{uuid.uuid4().hex[:4].upper()}"
        new_alert = Alert(
            id=alert_id,
            title=title,
            severity=rule.severity,
            rule_id=rule.id,
            rule_name=rule.name,
            timestamp=evidence_events[-1].timestamp if evidence_events else datetime.utcnow(),
            target_account=target_account,
            source_ip=source_ip,
            hostname=hostname,
            status="New",
            summary=summary,
            evidence_event_ids=evidence_ids_json,
            assigned_to="Analyst Yashaswini",
            resolution_summary=""
        )
        self.db.add(new_alert)

        # Link related_rule_id to events
        for e in evidence_events:
            e.related_rule_id = rule.id

        # Increment rule counter
        rule.alerts_count = (rule.alerts_count or 0) + 1
        self.db.commit()
        self.db.refresh(new_alert)

        return new_alert
