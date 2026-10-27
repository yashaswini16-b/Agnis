# AegisSOC — Enterprise Mini SIEM Security Monitoring Platform

A complete, functional, and demonstration-ready **Security Information and Event Management (SIEM)** platform built for security analysts and cybersecurity demonstration.

---

## 1. Project Overview & Architecture

AegisSOC models a modern Security Operations Center (SOC) monitoring station. It collects, correlates, and analyzes security telemetry using a configurable rule-based detection engine, flags suspicious activities as actionable alerts, and provides full triage and investigation workflows.

### High-Level Architecture
```
+-----------------------------------------------------------------------------------+
|                           AegisSOC Web Interface                                  |
|   (React 19 + TypeScript + Vite + Tailwind CSS v4 + Recharts + Lucide Icons)      |
|   • Overview Dashboard  • Event Explorer     • Alerts Triage  • Detection Rules   |
|   • Investigations      • Log Sources & Hub  • Reports        • Settings          |
+-----------------------------------------------------------------------------------+
                                    | (REST APIs via /api/*)
                                    v
+-----------------------------------------------------------------------------------+
|                        AegisSOC FastAPI Backend Engine                            |
|   • Ingestion Pipeline: Validates, deduplicates, and normalizes telemetry         |
|   • Detection Rule Engine: Sliding windows, configurable thresholds, dedup logic  |
|   • Scenario Generator: Synthesizes realistic attack patterns (brute force, etc.) |
|   • Reports & Export Service: CSV streaming & print-ready executive summaries     |
+-----------------------------------------------------------------------------------+
           |                                                      ^
           v (SQLAlchemy ORM)                                     | (HTTP POST /api/events/ingest)
+-----------------------+              +--------------------------------------------+
|  SQLite Persistent DB |              |  Real Windows Security Log Collectors      |
|  (Events, Rules,      |              |  • backend/collector.ps1 (Native PS)       |
|   Alerts, Notes,      |              |  • backend/windows_collector.py (Python)   |
|   Sources, Settings)  |              |  (Harvests live Event IDs 4624, 4625, 4740)|
+-----------------------+              +--------------------------------------------+
```

### Core Security Principles Implemented
- **Segregation of Telemetry Origin**: The platform strictly and visually distinguishes **Real Events** (harvested from monitored hosts) from **Simulated Events** (synthetically generated demonstration scenarios).
- **Inference vs. Conclusion**: Alerts represent rule-based anomaly indicators evaluated against thresholds. Suspicious activity is never falsely represented as a confirmed attack without analyst evidence and verification.
- **Deduplication & Integrity**: Ingested events utilize stable event IDs; duplicate ingestion is rejected. Alert deduplication prevents alert fatigue when evaluating rolling windows.

---

## 2. Implemented Features

### 1. Overview Dashboard
- **Dynamic KPI Cards**: Total Events, Critical Alerts, High Severity Alerts, Open Triage Investigations, Active Log Sources, and Triggered Detection Rules. All values calculated from underlying persistent storage.
- **Interactive Visualizations**:
  - Events & Alert Timeline: Dual-area gradient chart displaying telemetry volume against alert spikes.
  - Alert Severity Distribution: Color-coded donut chart adapting to theme.
  - Event Categories Breakdown: Horizontal bar chart categorizing telemetry (Authentication, Process Creation, Privilege Escalation, Account Management).
  - Rule Trigger Ranking: Leaderboard of most frequently triggered detections.
- **Recent Security Alerts Table**: Real-time triage table with direct links to the Investigation Workspace.

### 2. Event Explorer
- Multi-field keyword search across username, hostname, source IP, event ID, and descriptions.
- Instant filters by Severity, Category, Windows Event ID, Origin (Real vs. Simulated), and Time Range (15m, 1h, 24h, 7d, All).
- Column sorting, pagination controls (15, 25, 50, 100/page).
- Export to CSV functionality.
- Event Inspection Modal with formatted JSON viewer and one-click copy.
- Realistic Windows Event IDs:
  - `4624`: Successful Logon (Network, Interactive, RemoteInteractive RDP)
  - `4625`: Failed Logon (Sub-status codes `0xC000006A` bad password, etc.)
  - `4740`: User Account Locked Out
  - `4688`: Process Creation (with CommandLine telemetry)
  - `4672`: Special Privileges Assigned to New Logon

### 3. Detection Engine & Rules
A rule-based detection engine evaluating sliding time windows:
- **Rule 1: Repeated Failed Logins (`RULE-001`)**: Detects repeated failed logins exceeding threshold within time window (default: 5 events in 300s). Group by IP or account.
- **Rule 2: Successful Login After Repeated Failures (`RULE-002`)**: Detects successful logon immediately preceded by failed attempts (High severity).
- **Rule 3: Account Lockout Spike (`RULE-003`)**: Detects rapid account lockout events triggering security policies.
- **Rule 4: Suspicious PowerShell Activity (`RULE-004`)**: Identifies high-risk CLI parameters (`-EncodedCommand`, `DownloadString`, `Bypass`, `Invoke-Expression`).
- **Rule 5: Unusual Privileged Account Activity (`RULE-005`)**: Flags sensitive privileges assigned to designated administrative accounts.
- **Rule 6: Multiple Accounts Targeted From One IP (`RULE-006`)**: Detects password spraying against multiple distinct usernames from a single source IP.
- **Rule Management**: Enable/disable toggle switches, configuration editing (threshold, window, group-by, severity), custom rule creation, and a **Rule Test Modal** that executes rule diagnostics against recent events.

### 4. Alerts Management & Triage
- Filter by Severity, Status (New, In Progress, Resolved, Dismissed), and Search.
- In-place status update dropdowns persisting directly to the database.
- Triage summary counters.
- Direct navigation to Investigation Workspace.

### 5. Investigation Workspace
- Sidebar triage queue for selecting alerts.
- Top Incident Banner with severity, status, and entity chips (Target User, Source IP, Host) with one-click copy.
- Chronological Evidence Timeline showing sequence of qualifying events with expandable raw details.
- Analyst Investigation Notes log with new note submission.
- Incident Resolution findings summary and formal closure workflow.

### 6. Log Sources & Ingestion Hub
- Status cards for Domain Controller, Workstations, Databases, and the Local Windows Collector.
- **Demonstration Scenario Generator**: One-click generation of 7 realistic attack/baseline scenarios.
- **File Ingestion**: JSON and CSV upload parser with validation and detection engine processing.
- **Windows Collector Setup Guide**: Explicit instructions and code to collect real Windows Event Logs via PowerShell or Python.

### 7. Reports & Compliance
- Summary metrics: total events, alert severities, investigation resolution rate, top hosts, and rule frequency.
- Documented findings audit log from resolved incidents.
- CSV export and print-ready report format (`window.print()`).
- Academic disclaimer segregating simulated from real telemetry.

### 8. System Settings
- Theme toggle: Pure White Light Mode vs. Charcoal Gray Dark Mode (`#202124` / `#303134`).
- Retention policy and sliding window schedule configuration.
- Ingestion API Token display and regeneration.
- One-click Database Reset & Fresh Baseline Seeding.

---

## 3. Project Structure

```
d:\yashaswini project/
├── README.md                           # Documentation & operational guide
├── backend/
│   ├── database.py                     # SQLite engine & session management
│   ├── models.py                       # SQLAlchemy ORM models (Events, Alerts, Rules, etc.)
│   ├── schemas.py                      # Pydantic validation schemas
│   ├── detection_engine.py             # Rule correlation engine & deduplication
│   ├── event_generator.py              # Attack scenario & baseline telemetry generator
│   ├── main.py                         # FastAPI REST application & static mount
│   ├── collector.ps1                   # Standalone PowerShell Windows Security collector
│   ├── windows_collector.py            # Standalone Python Windows Security agent
│   ├── tests_acceptance.py             # Automated test suite (Tests A-G)
│   └── siem_database.db                # Persistent SQLite database
└── frontend/
    ├── package.json                    # Dependencies (React 19, Lucide, Recharts, Tailwind v4)
    ├── vite.config.ts                  # Vite build config with Tailwind v4 & /api proxy
    ├── tsconfig.json                   # TypeScript project references
    ├── tsconfig.app.json               # App TypeScript configuration
    ├── index.html                      # HTML entry with Inter font & metadata
    └── src/
        ├── index.css                   # Enterprise CSS variables (Light & Charcoal Dark)
        ├── main.tsx                    # React application root
        ├── App.tsx                     # Main layout & router switch
        ├── types.ts                    # TypeScript data models
        ├── context/
        │   └── AppContext.tsx          # Global theme, routing, search & notification state
        ├── components/
        │   ├── Layout/
        │   │   ├── Sidebar.tsx         # 8-page navigation sidebar
        │   │   └── Header.tsx          # Search, time range, theme toggle, profile menu
        │   └── UI/
        │       ├── Badges.tsx          # Severity, Status & Origin (Real vs Simulated) badges
        │       └── Modal.tsx           # Accessible modal dialog
        └── pages/
            ├── OverviewPage.tsx        # Dashboard with KPIs and Recharts
            ├── EventExplorerPage.tsx   # Event search, filters, pagination, JSON modal, CSV
            ├── AlertsPage.tsx          # Alert triage table with quick status updates
            ├── DetectionRulesPage.tsx  # Rule configuration, testing & custom rule creation
            ├── InvestigationWorkspacePage.tsx # Timeline, entity chips, notes, resolution
            ├── LogSourcesPage.tsx      # Source status, scenario generator, file upload
            ├── ReportsPage.tsx         # Executive reports, CSV export, print view
            └── SettingsPage.tsx        # Preferences, retention, token, database reset
```

---

## 4. Installation & Startup Instructions

### Prerequisites
- Python 3.10+ (installed in PATH)
- Node.js v18+ and npm

### Step 1: Install Frontend Dependencies & Build Bundle
```powershell
cd "d:\yashaswini project\frontend"
npm install
npm run build
```

### Step 2: Install Backend Dependencies
FastAPI and its dependencies are included in Python environment:
```powershell
pip install fastapi uvicorn sqlalchemy pydantic python-multipart
```

### Step 3: Run the Application
The backend serves both the REST API and the compiled frontend single-page application on a unified port:
```powershell
cd "d:\yashaswini project\backend"
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```
Open your browser and navigate to:
```
http://127.0.0.1:8000
```

*Optional Development Mode:*
If editing frontend code live with hot module reloading:
```powershell
# Terminal 1: Run Backend
cd "d:\yashaswini project\backend"
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Run Vite Dev Server (with API proxy)
cd "d:\yashaswini project\frontend"
npm run dev
# Open http://localhost:5173
```

---

## 5. Connecting a Real Windows Security Event Collector

To demonstrate authentic host event log ingestion:

### Option A: Native PowerShell Collector (Recommended)
1. Open PowerShell **as Administrator** on Windows.
2. Run the provided script:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "d:\yashaswini project\backend\collector.ps1"
```
3. The script harvests recent Security log entries (Logons 4624/4625, Process Creation 4688, Lockouts 4740), normalizes them, and forwards them to `http://127.0.0.1:8000/api/events/ingest`.
4. Check the **Log Sources** page: Log Source `SRC-004` will immediately transition from `Not Connected` to **Live**.
5. Events will appear in **Event Explorer** with the green **Real Event** badge.

### Option B: Python Collector Agent
Run from an administrative command prompt:
```powershell
python "d:\yashaswini project\backend\windows_collector.py"
```

---

## 6. Running Demonstration Scenarios

1. Navigate to the **Log Sources** page.
2. Locate the **Demonstration Scenario Generator** panel.
3. Select an attack scenario:
   - *Repeated Failed Logins*: Triggers `RULE-001` (Brute Force).
   - *Successful Login After Repeated Failures*: Triggers `RULE-002` (Compromise).
   - *Account Lockout Spike*: Triggers `RULE-003` (Lockout policy hit).
   - *Suspicious PowerShell Obfuscation*: Triggers `RULE-004` (Living-off-the-land).
   - *Unusual Privileged Account Activity*: Triggers `RULE-005` (Admin anomaly).
   - *Multiple Accounts Targeted From One IP*: Triggers `RULE-006` (Password Spray).
   - *Baseline Routine Activity*: Normal user logons and process creation.
4. Click **Generate & Ingest Scenario Events**.
5. Switch to **Alerts** or **Overview** to observe detection alerts generated in real time.

---

## 7. Verification & Acceptance Test Results

All acceptance criteria from Section 15 were executed and validated against the running platform using `backend/tests_acceptance.py`:

| Test Case | Description | Status | Verification Detail |
|---|---|---|---|
| **Test A** | Failed Login Detection | **PASSED** | Generated 6 failed logins; Event Explorer displayed events; `RULE-001` triggered alert `ALT-261026-C58D`. |
| **Test B** | Threshold Configuration | **PASSED** | Changed threshold from 5 to 10; 4 events generated no alert; reset threshold to 5. |
| **Test C** | Alert Investigation | **PASSED** | Added analyst note; updated status to "In Progress"; verified persistence across DB calls. |
| **Test D** | Event Ingestion & Rejection | **PASSED** | Ingested valid JSON batch; verified duplicate event IDs are rejected and deduplicated. |
| **Test E** | Theme Switching | **PASSED** | Switched between Pure White Light and Charcoal Gray Dark (`#202124`); verified styles and persistence. |
| **Test F** | Data Integrity & Dedup | **PASSED** | Ingested duplicate event batch; confirmed 0 duplicate records created. |
| **Test G** | Real vs. Simulated Segregation | **PASSED** | Ingested real collector telemetry; verified Log Source status transitioned to Live and badges marked "Real". |

To rerun the test suite at any time:
```powershell
cd "d:\yashaswini project\backend"
python tests_acceptance.py
```

---

## 8. Known Limitations & College Project Notes

1. **Localhost Single Node**: SQLite is used for persistent local demonstration. In enterprise multi-tenant deployments, replace with PostgreSQL or Elasticsearch.
2. **Administrative Privileges for Real Logs**: Windows restricts access to the `Security` log to Administrators or accounts in the `Event Log Readers` local group. Running the collector without elevation will log an informative permission notice.
3. **Simulated Labeling**: All generated scenarios and sample files are labeled `Simulated` across tables, modals, and reports to preserve evidentiary integrity.
