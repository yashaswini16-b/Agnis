# =====================================================================
# Standalone Windows Security Log Collector (PowerShell)
# Run as Administrator to harvest and stream live Windows Security events
# to the Mini SIEM endpoint.
# =====================================================================

param (
    [string]$SiemUrl = "http://127.0.0.1:8000/api/events/ingest",
    [int]$MaxEvents = 10
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Mini SIEM - Live Windows Security Event Log Forwarder" -ForegroundColor Yellow
Write-Host " Forwarding to: $SiemUrl" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

try {
    $events = Get-WinEvent -LogName 'Security' -MaxEvents $MaxEvents -ErrorAction Stop
} catch {
    Write-Host "[!] Unable to read Security Event Log. Please run this script as Administrator." -ForegroundColor Red
    exit 1
}

$payloadList = @()

foreach ($evt in $events) {
    $category = "Security Audit"
    $severity = "Informational"

    switch ($evt.Id) {
        4624 { $category = "Authentication"; $severity = "Informational" }
        4625 { $category = "Authentication"; $severity = "Medium" }
        4740 { $category = "Account Management"; $severity = "Medium" }
        4688 { $category = "Process Creation"; $severity = "Low" }
        4672 { $category = "Privilege Escalation"; $severity = "Low" }
        1102 { $category = "Audit Log Cleared"; $severity = "Critical" }
    }

    $summary = ($evt.Message -split "`r?`n")[0]
    if ([string]::IsNullOrWhiteSpace($summary)) {
        $summary = "Windows Event $($evt.Id) recorded on $($env:COMPUTERNAME)"
    }

    $user = $env:USERNAME
    $lines = $evt.Message -split "`r?`n"
    foreach ($l in $lines) {
        if ($l -match "Account Name:\s+(.+)") {
            $extracted = $matches[1].Trim()
            if ($extracted -ne "-" -and $extracted -ne "") {
                $user = $extracted
                break
            }
        }
    }

    $item = @{
        source_type    = "Real Windows Security Log"
        hostname       = $env:COMPUTERNAME
        event_category = $category
        event_id       = $evt.Id
        description    = $summary.Substring(0, [Math]::Min(250, $summary.Length))
        severity       = $severity
        username       = $user
        source_ip      = "127.0.0.1"
        origin         = "Real"
        raw_data       = @{
            RecordId  = $evt.RecordId
            Machine   = $evt.MachineName
            Message   = $evt.Message.Substring(0, [Math]::Min(1500, $evt.Message.Length))
        }
    }
    $payloadList += $item
}

$body = @{
    events = $payloadList
    origin = "Real"
} | ConvertTo-Json -Depth 5

try {
    $response = Invoke-RestMethod -Uri $SiemUrl -Method Post -Body $body -ContentType "application/json"
    Write-Host "[+] Successfully forwarded $($payloadList.Count) real Windows Security events to SIEM!" -ForegroundColor Green
    Write-Host "    Ingested: $($response.ingested_count) | Alerts Generated: $($response.alerts_generated)" -ForegroundColor Green
} catch {
    Write-Host "[-] Failed to send events to SIEM at $SiemUrl : $_" -ForegroundColor Red
}
