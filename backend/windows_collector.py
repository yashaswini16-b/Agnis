"""
Local Windows Security Event Log Forwarder
This standalone collector runs on a monitored Windows system with Administrator privileges.
It harvests real Windows Security event logs (Logons, Process Creations, Lockouts)
and forwards normalized events to the Mini SIEM ingestion endpoint.
"""

import sys
import time
import json
import socket
import subprocess
import urllib.request
import urllib.error

SIEM_INGEST_URL = "http://127.0.0.1:8000/api/events/ingest"
HOSTNAME = socket.gethostname()

def run_powershell(command: str) -> str:
    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
            capture_output=True,
            text=True,
            timeout=15
        )
        return result.stdout
    except Exception as e:
        print(f"[Collector Error] PowerShell execution failed: {e}")
        return ""

def get_recent_security_events(max_events: int = 10) -> list:
    """
    Harvests recent security events using Get-WinEvent from the Security log.
    Requires administrative permissions.
    """
    ps_cmd = f"""
    try {{
        $events = Get-WinEvent -LogName 'Security' -MaxEvents {max_events} -ErrorAction Stop | ForEach-Object {{
            [PSCustomObject]@{{
                Id = $_.Id
                TimeCreated = $_.TimeCreated.ToString('o')
                ProviderName = $_.ProviderName
                TaskDisplayName = $_.TaskDisplayName
                Message = $_.Message
                RecordId = $_.RecordId
            }}
        }}
        $events | ConvertTo-Json -Compress
    }} catch {{
        Write-Output "[]"
    }}
    """
    raw_output = run_powershell(ps_cmd).strip()
    if not raw_output or raw_output == "[]":
        return []
    
    try:
        parsed = json.loads(raw_output)
        if isinstance(parsed, dict):
            return [parsed]
        return parsed
    except Exception:
        return []

def normalize_windows_event(win_evt: dict) -> dict:
    evt_id = win_evt.get("Id", 0)
    msg = win_evt.get("Message", "")
    time_created = win_evt.get("TimeCreated")

    # Map Windows event ID to category
    category_map = {
        4624: "Authentication",
        4625: "Authentication",
        4740: "Account Management",
        4688: "Process Creation",
        4672: "Privilege Escalation",
        4720: "User Account Created",
        4726: "User Account Deleted",
        1102: "Audit Log Cleared"
    }
    category = category_map.get(evt_id, "Security Audit")

    # Severity mapping
    severity_map = {
        4625: "Medium",
        4740: "Medium",
        1102: "Critical",
        4672: "Low",
        4624: "Informational"
    }
    severity = severity_map.get(evt_id, "Informational")

    # Extract user if mentioned in first line of message
    summary_line = msg.splitlines()[0] if msg else f"Windows Security Event {evt_id}"
    username = None
    for line in msg.splitlines()[:15]:
        if "Account Name:" in line or "TargetUserName" in line:
            parts = line.split(":")
            if len(parts) > 1 and parts[1].strip() and parts[1].strip() != "-":
                username = parts[1].strip()
                break

    return {
        "source_type": "Real Windows Security Log",
        "hostname": HOSTNAME,
        "event_category": category,
        "event_id": evt_id,
        "description": summary_line[:250],
        "severity": severity,
        "username": username or "SYSTEM",
        "source_ip": "127.0.0.1",
        "origin": "Real",
        "raw_data": {
            "RecordId": win_evt.get("RecordId"),
            "ProviderName": win_evt.get("ProviderName"),
            "TaskDisplayName": win_evt.get("TaskDisplayName"),
            "FullMessage": msg[:1500]
        }
    }

def send_events_to_siem(events: list):
    if not events:
        return
    payload = json.dumps({"events": events, "origin": "Real"}).encode("utf-8")
    req = urllib.request.Request(
        SIEM_INGEST_URL,
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = response.read().decode("utf-8")
            print(f"[Collector Success] Forwarded {len(events)} real Windows events to SIEM: {res_data}")
    except urllib.error.URLError as e:
        print(f"[Collector Warning] SIEM endpoint unreachable at {SIEM_INGEST_URL}: {e}")

def main():
    print("==================================================")
    print(" Real Windows Security Log Ingestion Agent")
    print(f" Target SIEM: {SIEM_INGEST_URL}")
    print(f" Host: {HOSTNAME}")
    print("==================================================")
    print("Collecting recent Windows Security events...")
    raw_evts = get_recent_security_events(max_events=5)
    if not raw_evts:
        print("Note: Accessing Windows Security log requires Administrator privileges or Event Log Readers group.")
        print("Tip: Run PowerShell/Terminal as Administrator to stream live Security events.")
    else:
        normalized = [normalize_windows_event(e) for e in raw_evts]
        send_events_to_siem(normalized)

if __name__ == "__main__":
    main()
