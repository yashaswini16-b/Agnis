import os
import io
import csv
import json
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_

from database import engine, Base, get_db
from models import Event, DetectionRule, Alert, InvestigationNote, LogSource, AppSetting
from schemas import (
    EventCreate, EventResponse, AlertResponse, AlertUpdate,
    InvestigationNoteCreate, InvestigationNoteResponse,
    DetectionRuleCreate, DetectionRuleUpdate, DetectionRuleResponse,
    LogSourceResponse, ScenarioRequest, IngestionBatchRequest
)
from detection_engine import DetectionEngine, init_default_rules
from event_generator import generate_scenario_events, generate_event_id

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mini SIEM Security Monitoring Platform",
    description="Enterprise-grade Security Information & Event Management (SIEM) API",
    version="1.0.0"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize seed data
def seed_initial_state(db: Session):
    init_default_rules(db)

    # Seed initial log sources if empty
    sources = [
        {
            "id": "SRC-001",
            "name": "Domain Controller SEC-DC01",
            "source_type": "Windows Security Log",
            "hostname": "SEC-DC01.CORP.LOCAL",
            "status": "Demo Mode",
            "origin": "Simulated",
            "config_details": json.dumps({"channels": ["Security", "System"], "retention_days": 30})
        },
        {
            "id": "SRC-002",
            "name": "Finance Workstation WS-04",
            "source_type": "Windows Security Log",
            "hostname": "WS-FINANCE-04.CORP.LOCAL",
            "status": "Demo Mode",
            "origin": "Simulated",
            "config_details": json.dumps({"channels": ["Security"], "retention_days": 14})
        },
        {
            "id": "SRC-003",
            "name": "Database Cluster SRV-SQL01",
            "source_type": "Windows Security Log",
            "hostname": "SRV-SQL01.CORP.LOCAL",
            "status": "Demo Mode",
            "origin": "Simulated",
            "config_details": json.dumps({"channels": ["Security", "Application"], "retention_days": 60})
        },
        {
            "id": "SRC-004",
            "name": "Local Windows Security Collector (Live Agent)",
            "source_type": "Real Windows Security Log",
            "hostname": "LOCALHOST",
            "status": "Not Connected",
            "origin": "Real",
            "config_details": json.dumps({
                "agent_version": "1.0-ps",
                "target_endpoint": "/api/events/ingest",
                "instructions": "Run backend/collector.ps1 or backend/windows_collector.py with Administrator privileges to stream live events."
            })
        }
    ]

    for s in sources:
        existing = db.query(LogSource).filter(LogSource.id == s["id"]).first()
        if not existing:
            new_source = LogSource(
                id=s["id"],
                name=s["name"],
                source_type=s["source_type"],
                hostname=s["hostname"],
                status=s["status"],
                origin=s["origin"],
                config_details=s["config_details"],
                event_count=0
            )
            db.add(new_source)

    # Seed baseline events if DB is empty
    evt_count = db.query(Event).count()
    if evt_count == 0:
        # Seed baseline normal events and a sample brute-force to show immediately on first boot
        baseline_events = generate_scenario_events("normal_activity", count=8)
        demo_attack_events = generate_scenario_events("failed_logins", target_user="administrator", source_ip="192.168.1.188", count=6)
        all_initial = baseline_events + demo_attack_events
        for e in all_initial:
            db.add(e)
        db.commit()

        # Update log source counts
        src1 = db.query(LogSource).filter(LogSource.id == "SRC-001").first()
        if src1:
            src1.event_count = len(all_initial)
            src1.last_event_time = datetime.utcnow()
            db.commit()

        # Run detection engine to populate initial demo alert
        engine = DetectionEngine(db)
        engine.evaluate_all()

    db.commit()

@app.on_event("startup")
def on_startup():
    from database import SessionLocal
    db = SessionLocal()
    try:
        seed_initial_state(db)
    finally:
        db.close()

# Helper function to parse time window filters
def get_cutoff_for_time_range(time_range: str) -> Optional[datetime]:
    now = datetime.utcnow()
    if time_range == "15m":
        return now - timedelta(minutes=15)
    elif time_range == "1h":
        return now - timedelta(hours=1)
    elif time_range == "24h":
        return now - timedelta(hours=24)
    elif time_range == "7d":
        return now - timedelta(days=7)
    elif time_range == "30d":
        return now - timedelta(days=30)
    return None

# ==========================================
# OVERVIEW & DASHBOARD ENDPOINTS
# ==========================================
@app.get("/api/overview")
def get_overview(time_range: str = "24h", db: Session = Depends(get_db)):
    cutoff = get_cutoff_for_time_range(time_range)

    # Base queries with optional time range
    event_query = db.query(Event)
    alert_query = db.query(Alert)

    if cutoff:
        event_query = event_query.filter(Event.timestamp >= cutoff)
        alert_query = alert_query.filter(Alert.timestamp >= cutoff)

    total_events = event_query.count()
    critical_alerts = alert_query.filter(Alert.severity == "Critical").count()
    high_alerts = alert_query.filter(Alert.severity == "High").count()
    open_investigations = alert_query.filter(Alert.status.in_(["New", "In Progress"])).count()
    active_sources = db.query(LogSource).filter(LogSource.status.in_(["Live", "Demo Mode", "Ingesting"])).count()
    triggered_rules = db.query(DetectionRule).filter(DetectionRule.alerts_count > 0).count()

    # Severity distribution
    severity_counts = {
        "Critical": alert_query.filter(Alert.severity == "Critical").count(),
        "High": alert_query.filter(Alert.severity == "High").count(),
        "Medium": alert_query.filter(Alert.severity == "Medium").count(),
        "Low": alert_query.filter(Alert.severity == "Low").count()
    }

    # Top event categories
    cat_results = (
        event_query.with_entities(Event.event_category, func.count(Event.id))
        .group_by(Event.event_category)
        .order_by(desc(func.count(Event.id)))
        .limit(6)
        .all()
    )
    categories = [{"category": c[0] or "Unknown", "count": c[1]} for c in cat_results]

    # Top log sources
    src_results = (
        event_query.with_entities(Event.hostname, func.count(Event.id))
        .group_by(Event.hostname)
        .order_by(desc(func.count(Event.id)))
        .limit(6)
        .all()
    )
    sources = [{"hostname": s[0] or "Unknown", "count": s[1]} for s in src_results]

    # Most frequently triggered rules
    rule_results = (
        db.query(DetectionRule)
        .order_by(desc(DetectionRule.alerts_count))
        .limit(6)
        .all()
    )
    top_rules = [{"id": r.id, "name": r.name, "severity": r.severity, "count": r.alerts_count} for r in rule_results]

    # Events over time (e.g. grouped in hourly / 10-minute buckets)
    now = datetime.utcnow()
    timeline_buckets = []
    bucket_count = 12
    step_minutes = 120 if time_range in ["24h", "all"] else (10 if time_range == "1h" else 2)

    for i in range(bucket_count - 1, -1, -1):
        bucket_end = now - timedelta(minutes=i * step_minutes)
        bucket_start = bucket_end - timedelta(minutes=step_minutes)
        c = db.query(Event).filter(Event.timestamp >= bucket_start, Event.timestamp < bucket_end).count()
        ac = db.query(Alert).filter(Alert.timestamp >= bucket_start, Alert.timestamp < bucket_end).count()
        timeline_buckets.append({
            "time": bucket_end.strftime("%H:%M"),
            "events": c,
            "alerts": ac
        })

    # Recent security alerts
    recent_alerts = alert_query.order_by(desc(Alert.timestamp)).limit(8).all()
    recent_alerts_data = []
    for a in recent_alerts:
        recent_alerts_data.append({
            "id": a.id,
            "timestamp": a.timestamp.isoformat(),
            "severity": a.severity,
            "title": a.title,
            "rule_name": a.rule_name,
            "status": a.status,
            "source_ip": a.source_ip,
            "target_account": a.target_account,
            "hostname": a.hostname
        })

    return {
        "summary": {
            "total_events": total_events,
            "critical_alerts": critical_alerts,
            "high_alerts": high_alerts,
            "open_investigations": open_investigations,
            "active_sources": active_sources,
            "triggered_rules": triggered_rules
        },
        "severity_distribution": severity_counts,
        "event_categories": categories,
        "top_sources": sources,
        "top_rules": top_rules,
        "events_over_time": timeline_buckets,
        "recent_alerts": recent_alerts_data
    }

# ==========================================
# EVENT EXPLORER ENDPOINTS
# ==========================================
@app.get("/api/events")
def get_events(
    search: Optional[str] = None,
    severity: Optional[str] = None,
    event_category: Optional[str] = None,
    event_id: Optional[int] = None,
    hostname: Optional[str] = None,
    username: Optional[str] = None,
    source_ip: Optional[str] = None,
    origin: Optional[str] = None,  # Real, Simulated, or None
    time_range: Optional[str] = None,
    sort_by: str = "timestamp",
    sort_order: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Event)

    # Search keyword filter across multiple fields
    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                Event.description.ilike(s_term),
                Event.username.ilike(s_term),
                Event.hostname.ilike(s_term),
                Event.source_ip.ilike(s_term),
                Event.event_category.ilike(s_term),
                Event.id.ilike(s_term)
            )
        )

    if severity and severity != "All":
        query = query.filter(Event.severity == severity)
    if event_category and event_category != "All":
        query = query.filter(Event.event_category == event_category)
    if event_id:
        query = query.filter(Event.event_id == event_id)
    if hostname and hostname != "All":
        query = query.filter(Event.hostname == hostname)
    if username:
        query = query.filter(Event.username.ilike(f"%{username}%"))
    if source_ip:
        query = query.filter(Event.source_ip.ilike(f"%{source_ip}%"))
    if origin and origin != "All":
        query = query.filter(Event.origin == origin)

    cutoff = get_cutoff_for_time_range(time_range) if time_range else None
    if cutoff:
        query = query.filter(Event.timestamp >= cutoff)

    # Sorting
    sort_col = getattr(Event, sort_by, Event.timestamp)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    # Format items
    events_data = []
    for item in items:
        raw = {}
        if item.raw_data:
            try:
                raw = json.loads(item.raw_data) if isinstance(item.raw_data, str) else item.raw_data
            except Exception:
                raw = {}
        events_data.append({
            "id": item.id,
            "timestamp": item.timestamp.isoformat(),
            "source_type": item.source_type,
            "hostname": item.hostname,
            "source_ip": item.source_ip,
            "destination_ip": item.destination_ip,
            "username": item.username,
            "event_category": item.event_category,
            "event_id": item.event_id,
            "description": item.description,
            "severity": item.severity,
            "origin": item.origin,
            "related_rule_id": item.related_rule_id,
            "raw_data": raw
        })

    return {
        "items": events_data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size)
    }

@app.get("/api/events/{event_id}")
def get_event_detail(event_id: str, db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    raw = {}
    if event.raw_data:
        try:
            raw = json.loads(event.raw_data) if isinstance(event.raw_data, str) else event.raw_data
        except Exception:
            raw = {}

    return {
        "id": event.id,
        "timestamp": event.timestamp.isoformat(),
        "source_type": event.source_type,
        "hostname": event.hostname,
        "source_ip": event.source_ip,
        "destination_ip": event.destination_ip,
        "username": event.username,
        "event_category": event.event_category,
        "event_id": event.event_id,
        "description": event.description,
        "severity": event.severity,
        "origin": event.origin,
        "related_rule_id": event.related_rule_id,
        "raw_data": raw
    }

@app.get("/api/events/export/csv")
def export_events_csv(
    search: Optional[str] = None,
    severity: Optional[str] = None,
    origin: Optional[str] = None,
    time_range: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Event)
    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                Event.description.ilike(s_term),
                Event.username.ilike(s_term),
                Event.hostname.ilike(s_term),
                Event.source_ip.ilike(s_term)
            )
        )
    if severity and severity != "All":
        query = query.filter(Event.severity == severity)
    if origin and origin != "All":
        query = query.filter(Event.origin == origin)
    cutoff = get_cutoff_for_time_range(time_range) if time_range else None
    if cutoff:
        query = query.filter(Event.timestamp >= cutoff)

    events = query.order_by(desc(Event.timestamp)).limit(2000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Event ID", "Timestamp", "Source Type", "Hostname", "Event ID Code", "Category", "Severity", "Username", "Source IP", "Origin", "Description"])

    for e in events:
        writer.writerow([
            e.id,
            e.timestamp.isoformat(),
            e.source_type,
            e.hostname,
            e.event_id or "",
            e.event_category,
            e.severity,
            e.username or "",
            e.source_ip or "",
            e.origin,
            e.description
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=siem_events_export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

# ==========================================
# INGESTION & SIMULATION ENGINE
# ==========================================
@app.post("/api/events/ingest")
def ingest_events(batch: IngestionBatchRequest, db: Session = Depends(get_db)):
    """
    Ingest events from local collector, API, or tests.
    Validates data, prevents duplicate event IDs, updates log source metadata,
    and runs the detection engine.
    """
    if not batch.events:
        return {"status": "ok", "ingested_count": 0, "alerts_generated": 0}

    ingested_events = []
    has_real = False

    for e_data in batch.events:
        # Prevent duplicate event IDs
        eid = e_data.id or generate_event_id()
        existing = db.query(Event).filter(Event.id == eid).first()
        if existing:
            continue  # Safe deduplication

        evt_origin = e_data.origin or batch.origin or "Simulated"
        if evt_origin == "Real":
            has_real = True

        raw_str = json.dumps(e_data.raw_data) if e_data.raw_data else "{}"

        new_event = Event(
            id=eid,
            timestamp=e_data.timestamp or datetime.utcnow(),
            source_type=e_data.source_type,
            hostname=e_data.hostname,
            source_ip=e_data.source_ip,
            destination_ip=e_data.destination_ip,
            username=e_data.username,
            event_category=e_data.event_category,
            event_id=e_data.event_id,
            description=e_data.description,
            severity=e_data.severity or "Low",
            raw_data=raw_str,
            origin=evt_origin
        )
        db.add(new_event)
        ingested_events.append(new_event)

    db.commit()

    # Update LogSource status
    if has_real:
        real_src = db.query(LogSource).filter(LogSource.id == "SRC-004").first()
        if real_src:
            real_src.status = "Live"
            real_src.last_event_time = datetime.utcnow()
            real_src.event_count = (real_src.event_count or 0) + len(ingested_events)
            db.commit()

    # Run detection engine over newly saved events
    engine = DetectionEngine(db)
    new_alerts = engine.evaluate_all()

    return {
        "status": "ok",
        "ingested_count": len(ingested_events),
        "alerts_generated": len(new_alerts),
        "new_alert_ids": [a.id for a in new_alerts]
    }

@app.post("/api/events/import/file")
async def import_event_file(file: UploadFile = File(...), origin: str = "Simulated", db: Session = Depends(get_db)):
    """
    Import events from JSON or CSV file safely with validation.
    """
    content = await file.read()
    filename = file.filename.lower()
    imported_list = []

    try:
        if filename.endswith(".json"):
            data = json.loads(content.decode("utf-8"))
            if isinstance(data, dict) and "events" in data:
                data = data["events"]
            if not isinstance(data, list):
                raise HTTPException(status_code=400, detail="JSON must contain a list of event objects")

            for item in data:
                imported_list.append(EventCreate(
                    id=item.get("id"),
                    timestamp=item.get("timestamp"),
                    source_type=item.get("source_type", "Imported File Log"),
                    hostname=item.get("hostname", "IMPORT-HOST"),
                    source_ip=item.get("source_ip"),
                    destination_ip=item.get("destination_ip"),
                    username=item.get("username"),
                    event_category=item.get("event_category", "Security Audit"),
                    event_id=item.get("event_id"),
                    description=item.get("description", "Imported security log record"),
                    severity=item.get("severity", "Low"),
                    raw_data=item.get("raw_data", {}),
                    origin=origin
                ))

        elif filename.endswith(".csv"):
            text_stream = io.StringIO(content.decode("utf-8"))
            reader = csv.DictReader(text_stream)
            for row in reader:
                imported_list.append(EventCreate(
                    id=row.get("id") or row.get("Event ID"),
                    source_type=row.get("source_type") or row.get("Source Type", "Imported CSV Log"),
                    hostname=row.get("hostname") or row.get("Hostname", "CSV-HOST"),
                    source_ip=row.get("source_ip") or row.get("Source IP"),
                    username=row.get("username") or row.get("Username"),
                    event_category=row.get("event_category") or row.get("Category", "Security Audit"),
                    event_id=int(row.get("event_id") or row.get("Event ID Code")) if (row.get("event_id") or row.get("Event ID Code")) else None,
                    description=row.get("description") or row.get("Description", "Imported CSV Event"),
                    severity=row.get("severity") or row.get("Severity", "Low"),
                    origin=origin
                ))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a .json or .csv file.")

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    req = IngestionBatchRequest(events=imported_list, origin=origin)
    return ingest_events(req, db)

@app.post("/api/scenarios/generate")
def generate_scenario(req: ScenarioRequest, db: Session = Depends(get_db)):
    """
    Generates controlled demonstration events for specific scenarios
    and processes them through the detection engine.
    Always explicitly marked as 'Simulated'.
    """
    events = generate_scenario_events(
        scenario=req.scenario,
        target_user=req.target_user or "admin",
        source_ip=req.source_ip or "192.168.1.105",
        count=req.count
    )

    for e in events:
        db.add(e)
    db.commit()

    # Update demo log source
    src = db.query(LogSource).filter(LogSource.id == "SRC-001").first()
    if src:
        src.event_count = (src.event_count or 0) + len(events)
        src.last_event_time = datetime.utcnow()
        db.commit()

    # Run detection engine
    engine = DetectionEngine(db)
    new_alerts = engine.evaluate_all()

    return {
        "status": "success",
        "scenario": req.scenario,
        "events_created": len(events),
        "alerts_triggered": len(new_alerts),
        "new_alert_ids": [a.id for a in new_alerts]
    }

# ==========================================
# DETECTION RULES ENDPOINTS
# ==========================================
@app.get("/api/rules")
def get_rules(db: Session = Depends(get_db)):
    rules = db.query(DetectionRule).order_by(DetectionRule.id.asc()).all()
    out = []
    for r in rules:
        cond = {}
        if r.conditions:
            try:
                cond = json.loads(r.conditions) if isinstance(r.conditions, str) else r.conditions
            except Exception:
                cond = {}
        out.append({
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "severity": r.severity,
            "is_enabled": r.is_enabled,
            "rule_type": r.rule_type,
            "threshold": r.threshold,
            "time_window_seconds": r.time_window_seconds,
            "group_by": r.group_by,
            "conditions": cond,
            "alerts_count": r.alerts_count or 0,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None
        })
    return out

@app.post("/api/rules")
def create_rule(rule_data: DetectionRuleCreate, db: Session = Depends(get_db)):
    existing = db.query(DetectionRule).filter(DetectionRule.id == rule_data.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Rule ID already exists")

    new_rule = DetectionRule(
        id=rule_data.id or f"RULE-{uuid.uuid4().hex[:4].upper()}",
        name=rule_data.name,
        description=rule_data.description,
        severity=rule_data.severity,
        is_enabled=rule_data.is_enabled,
        rule_type=rule_data.rule_type,
        threshold=rule_data.threshold,
        time_window_seconds=rule_data.time_window_seconds,
        group_by=rule_data.group_by,
        conditions=json.dumps(rule_data.conditions),
        alerts_count=0
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return {"status": "created", "rule_id": new_rule.id}

@app.put("/api/rules/{rule_id}")
def update_rule(rule_id: str, updates: DetectionRuleUpdate, db: Session = Depends(get_db)):
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    if updates.name is not None:
        rule.name = updates.name
    if updates.description is not None:
        rule.description = updates.description
    if updates.severity is not None:
        rule.severity = updates.severity
    if updates.is_enabled is not None:
        rule.is_enabled = updates.is_enabled
    if updates.threshold is not None:
        rule.threshold = updates.threshold
    if updates.time_window_seconds is not None:
        rule.time_window_seconds = updates.time_window_seconds
    if updates.group_by is not None:
        rule.group_by = updates.group_by
    if updates.conditions is not None:
        rule.conditions = json.dumps(updates.conditions)

    db.commit()
    db.refresh(rule)
    return {"status": "updated", "rule_id": rule.id}

@app.post("/api/rules/{rule_id}/test")
def test_rule(rule_id: str, db: Session = Depends(get_db)):
    """
    Test rule execution logic against recent events without altering persistent alerts.
    """
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    engine = DetectionEngine(db)
    # Fetch sample events from past 24 hours
    events = db.query(Event).order_by(desc(Event.timestamp)).limit(100).all()

    simulated_alerts = engine.evaluate_rule(rule, sample_events=events)

    return {
        "rule_id": rule.id,
        "rule_name": rule.name,
        "evaluated_events_count": len(events),
        "would_trigger": len(simulated_alerts) > 0,
        "alert_count": len(simulated_alerts),
        "simulated_alerts": [
            {
                "title": a.title,
                "severity": a.severity,
                "summary": a.summary,
                "target_account": a.target_account,
                "source_ip": a.source_ip,
                "evidence_count": len(json.loads(a.evidence_event_ids)) if a.evidence_event_ids else 0
            }
            for a in simulated_alerts
        ]
    }

# ==========================================
# ALERTS & INVESTIGATION WORKSPACE ENDPOINTS
# ==========================================
@app.get("/api/alerts")
def get_alerts(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    rule_id: Optional[str] = None,
    search: Optional[str] = None,
    time_range: Optional[str] = None,
    sort_by: str = "timestamp",
    sort_order: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)

    if severity and severity != "All":
        query = query.filter(Alert.severity == severity)
    if status and status != "All":
        query = query.filter(Alert.status == status)
    if rule_id and rule_id != "All":
        query = query.filter(Alert.rule_id == rule_id)
    if search:
        s_term = f"%{search}%"
        query = query.filter(
            or_(
                Alert.title.ilike(s_term),
                Alert.id.ilike(s_term),
                Alert.target_account.ilike(s_term),
                Alert.source_ip.ilike(s_term),
                Alert.summary.ilike(s_term)
            )
        )
    cutoff = get_cutoff_for_time_range(time_range) if time_range else None
    if cutoff:
        query = query.filter(Alert.timestamp >= cutoff)

    sort_col = getattr(Alert, sort_by, Alert.timestamp)
    if sort_order.lower() == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    alerts_data = []
    for a in items:
        evidence = json.loads(a.evidence_event_ids) if a.evidence_event_ids else []
        alerts_data.append({
            "id": a.id,
            "title": a.title,
            "severity": a.severity,
            "rule_id": a.rule_id,
            "rule_name": a.rule_name,
            "timestamp": a.timestamp.isoformat(),
            "target_account": a.target_account,
            "source_ip": a.source_ip,
            "hostname": a.hostname,
            "status": a.status,
            "summary": a.summary,
            "evidence_count": len(evidence),
            "evidence_event_ids": evidence,
            "assigned_to": a.assigned_to,
            "resolution_summary": a.resolution_summary,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None
        })

    return {
        "items": alerts_data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size)
    }

@app.get("/api/alerts/{alert_id}")
def get_alert_detail(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    evidence_ids = json.loads(alert.evidence_event_ids) if alert.evidence_event_ids else []

    # Retrieve all related evidence events
    evidence_events = db.query(Event).filter(Event.id.in_(evidence_ids)).order_by(Event.timestamp.asc()).all()
    evidence_data = []
    for e in evidence_events:
        raw = {}
        if e.raw_data:
            try:
                raw = json.loads(e.raw_data) if isinstance(e.raw_data, str) else e.raw_data
            except Exception:
                raw = {}
        evidence_data.append({
            "id": e.id,
            "timestamp": e.timestamp.isoformat(),
            "source_type": e.source_type,
            "hostname": e.hostname,
            "source_ip": e.source_ip,
            "username": e.username,
            "event_category": e.event_category,
            "event_id": e.event_id,
            "description": e.description,
            "severity": e.severity,
            "origin": e.origin,
            "raw_data": raw
        })

    # Retrieve notes
    notes = (
        db.query(InvestigationNote)
        .filter(InvestigationNote.alert_id == alert_id)
        .order_by(InvestigationNote.timestamp.asc())
        .all()
    )
    notes_data = [
        {
            "id": n.id,
            "author": n.author,
            "timestamp": n.timestamp.isoformat(),
            "note_text": n.note_text
        }
        for n in notes
    ]

    # Retrieve triggering rule details
    rule = db.query(DetectionRule).filter(DetectionRule.id == alert.rule_id).first()
    rule_info = {
        "id": rule.id if rule else alert.rule_id,
        "name": rule.name if rule else alert.rule_name,
        "description": rule.description if rule else "",
        "threshold": rule.threshold if rule else 1,
        "time_window_seconds": rule.time_window_seconds if rule else 300,
        "group_by": rule.group_by if rule else "source_ip"
    }

    return {
        "id": alert.id,
        "title": alert.title,
        "severity": alert.severity,
        "rule_id": alert.rule_id,
        "rule_name": alert.rule_name,
        "rule_info": rule_info,
        "timestamp": alert.timestamp.isoformat(),
        "target_account": alert.target_account,
        "source_ip": alert.source_ip,
        "hostname": alert.hostname,
        "status": alert.status,
        "summary": alert.summary,
        "assigned_to": alert.assigned_to,
        "resolution_summary": alert.resolution_summary,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
        "updated_at": alert.updated_at.isoformat() if alert.updated_at else None,
        "evidence_events": evidence_data,
        "notes": notes_data
    }

@app.patch("/api/alerts/{alert_id}")
def update_alert(alert_id: str, updates: AlertUpdate, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if updates.status is not None:
        alert.status = updates.status
    if updates.assigned_to is not None:
        alert.assigned_to = updates.assigned_to
    if updates.resolution_summary is not None:
        alert.resolution_summary = updates.resolution_summary

    alert.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    return {"status": "updated", "alert_id": alert.id, "current_status": alert.status}

@app.post("/api/alerts/{alert_id}/notes")
def add_alert_note(alert_id: str, note_req: InvestigationNoteCreate, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    new_note = InvestigationNote(
        alert_id=alert_id,
        author=note_req.author or "Security Analyst",
        timestamp=datetime.utcnow(),
        note_text=note_req.note_text
    )
    db.add(new_note)
    alert.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(new_note)

    return {
        "id": new_note.id,
        "alert_id": new_note.alert_id,
        "author": new_note.author,
        "timestamp": new_note.timestamp.isoformat(),
        "note_text": new_note.note_text
    }

# ==========================================
# LOG SOURCES ENDPOINTS
# ==========================================
@app.get("/api/log-sources")
def get_log_sources(db: Session = Depends(get_db)):
    sources = db.query(LogSource).all()
    out = []
    for s in sources:
        cfg = {}
        if s.config_details:
            try:
                cfg = json.loads(s.config_details) if isinstance(s.config_details, str) else s.config_details
            except Exception:
                cfg = {}
        out.append({
            "id": s.id,
            "name": s.name,
            "source_type": s.source_type,
            "hostname": s.hostname,
            "status": s.status,
            "last_event_time": s.last_event_time.isoformat() if s.last_event_time else None,
            "event_count": s.event_count or 0,
            "origin": s.origin,
            "config_details": cfg
        })
    return out

# ==========================================
# REPORTS ENDPOINTS
# ==========================================
@app.get("/api/reports/summary")
def get_reports_summary(time_range: str = "7d", db: Session = Depends(get_db)):
    cutoff = get_cutoff_for_time_range(time_range)

    event_q = db.query(Event)
    alert_q = db.query(Alert)

    if cutoff:
        event_q = event_q.filter(Event.timestamp >= cutoff)
        alert_q = alert_q.filter(Alert.timestamp >= cutoff)

    total_events = event_q.count()
    total_alerts = alert_q.count()

    # Alerts by severity
    sev_data = {
        "Critical": alert_q.filter(Alert.severity == "Critical").count(),
        "High": alert_q.filter(Alert.severity == "High").count(),
        "Medium": alert_q.filter(Alert.severity == "Medium").count(),
        "Low": alert_q.filter(Alert.severity == "Low").count()
    }

    # Status breakdown
    status_data = {
        "New": alert_q.filter(Alert.status == "New").count(),
        "In Progress": alert_q.filter(Alert.status == "In Progress").count(),
        "Resolved": alert_q.filter(Alert.status == "Resolved").count(),
        "Dismissed": alert_q.filter(Alert.status == "Dismissed").count()
    }

    # Rule breakdown
    rule_breakdown = (
        alert_q.with_entities(Alert.rule_name, Alert.severity, func.count(Alert.id))
        .group_by(Alert.rule_name, Alert.severity)
        .order_by(desc(func.count(Alert.id)))
        .all()
    )
    rules_list = [{"rule_name": r[0], "severity": r[1], "count": r[2]} for r in rule_breakdown]

    # Top observed hosts
    top_hosts = (
        event_q.with_entities(Event.hostname, func.count(Event.id))
        .group_by(Event.hostname)
        .order_by(desc(func.count(Event.id)))
        .limit(5)
        .all()
    )
    hosts_list = [{"hostname": h[0] or "Unknown", "count": h[1]} for h in top_hosts]

    # Investigations resolved
    resolved_alerts = (
        alert_q.filter(Alert.status == "Resolved")
        .order_by(desc(Alert.updated_at))
        .limit(10)
        .all()
    )
    resolved_findings = [
        {
            "id": a.id,
            "title": a.title,
            "resolved_at": a.updated_at.isoformat() if a.updated_at else a.timestamp.isoformat(),
            "resolution": a.resolution_summary or "Investigated and closed by security analyst."
        }
        for a in resolved_alerts
    ]

    return {
        "time_range": time_range,
        "total_events": total_events,
        "total_alerts": total_alerts,
        "alerts_by_severity": sev_data,
        "alerts_by_status": status_data,
        "alerts_by_rule": rules_list,
        "top_hosts": hosts_list,
        "resolved_findings": resolved_findings
    }

@app.get("/api/reports/export/csv")
def export_reports_csv(time_range: str = "7d", db: Session = Depends(get_db)):
    cutoff = get_cutoff_for_time_range(time_range)
    query = db.query(Alert)
    if cutoff:
        query = query.filter(Alert.timestamp >= cutoff)

    alerts = query.order_by(desc(Alert.timestamp)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Alert ID", "Timestamp", "Title", "Severity", "Rule ID", "Rule Name", "Target Account", "Source IP", "Hostname", "Status", "Resolution Summary"])

    for a in alerts:
        writer.writerow([
            a.id,
            a.timestamp.isoformat(),
            a.title,
            a.severity,
            a.rule_id or "",
            a.rule_name,
            a.target_account or "",
            a.source_ip or "",
            a.hostname or "",
            a.status,
            a.resolution_summary or ""
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=siem_incident_report_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
    )

# ==========================================
# SETTINGS & ADMIN ENDPOINTS
# ==========================================
@app.get("/api/settings")
def get_settings(db: Session = Depends(get_db)):
    settings_rows = db.query(AppSetting).all()
    settings_dict = {s.key: s.value for s in settings_rows}

    defaults = {
        "theme": "dark",
        "default_time_range": "24h",
        "retention_days": "30",
        "analyst_name": "Analyst Yashaswini",
        "analyst_email": "yashaswini.analyst@corp.security",
        "auto_eval_interval": "60",
        "ingest_api_token": "siem-token-sec-demo-9921"
    }

    for k, v in defaults.items():
        if k not in settings_dict:
            settings_dict[k] = v

    return settings_dict

@app.post("/api/settings")
def save_settings(settings: Dict[str, str], db: Session = Depends(get_db)):
    for k, v in settings.items():
        existing = db.query(AppSetting).filter(AppSetting.key == k).first()
        if existing:
            existing.value = str(v)
        else:
            db.add(AppSetting(key=k, value=str(v)))
    db.commit()
    return {"status": "saved", "settings": settings}

@app.post("/api/database/seed")
def seed_database(db: Session = Depends(get_db)):
    seed_initial_state(db)
    return {"status": "success", "message": "Baseline data seeded successfully"}

@app.post("/api/database/reset")
def reset_database(db: Session = Depends(get_db)):
    """
    Cleans all events and alerts, reseeds default detection rules and log sources.
    """
    db.query(InvestigationNote).delete()
    db.query(Alert).delete()
    db.query(Event).delete()
    db.commit()

    # Reset rule trigger counters
    for r in db.query(DetectionRule).all():
        r.alerts_count = 0
    db.commit()

    # Reset log source counts
    for s in db.query(LogSource).all():
        s.event_count = 0
        s.last_event_time = None
        if s.id == "SRC-004":
            s.status = "Not Connected"
        else:
            s.status = "Demo Mode"
    db.commit()

    # Seed baseline demo data
    seed_initial_state(db)

    return {"status": "success", "message": "Database reset and fresh demonstration baseline seeded"}

# Mount frontend static files if built
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
