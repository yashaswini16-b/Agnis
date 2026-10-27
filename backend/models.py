import datetime
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    source_type = Column(String(100), default="Windows Security Log", index=True)
    hostname = Column(String(100), default="SEC-DC01.CORP.LOCAL", index=True)
    source_ip = Column(String(45), nullable=True, index=True)
    destination_ip = Column(String(45), nullable=True)
    username = Column(String(100), nullable=True, index=True)
    event_category = Column(String(100), default="Authentication", index=True)
    event_id = Column(Integer, nullable=True, index=True)  # e.g., 4624, 4625, 4740, 4688, 4672
    description = Column(String(255), default="")
    severity = Column(String(20), default="Low", index=True)  # Informational, Low, Medium, High, Critical
    raw_data = Column(Text, default="{}")  # JSON string
    origin = Column(String(20), default="Simulated", index=True)  # "Real" or "Simulated"
    related_rule_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class DetectionRule(Base):
    __tablename__ = "detection_rules"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, default="")
    severity = Column(String(20), default="Medium")  # Low, Medium, High, Critical
    is_enabled = Column(Boolean, default=True)
    rule_type = Column(String(50), nullable=False)  # failed_logins, login_after_failures, account_lockout, suspicious_powershell, privileged_activity, multiple_accounts_one_ip, custom
    threshold = Column(Integer, default=5)
    time_window_seconds = Column(Integer, default=300)
    group_by = Column(String(50), default="source_ip")  # account, source_ip, both, host, none
    conditions = Column(Text, default="{}")  # JSON encoded conditions
    alerts_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    severity = Column(String(20), default="Medium", index=True)
    rule_id = Column(String(50), ForeignKey("detection_rules.id"), nullable=True)
    rule_name = Column(String(150), default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    target_account = Column(String(100), nullable=True, index=True)
    source_ip = Column(String(45), nullable=True, index=True)
    hostname = Column(String(100), nullable=True)
    status = Column(String(30), default="New", index=True)  # New, In Progress, Resolved, Dismissed
    summary = Column(Text, default="")
    evidence_event_ids = Column(Text, default="[]")  # JSON array of event IDs
    assigned_to = Column(String(100), default="Analyst Yashaswini")
    resolution_summary = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    notes = relationship("InvestigationNote", back_populates="alert", cascade="all, delete-orphan")

class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(String(50), ForeignKey("alerts.id"), nullable=False, index=True)
    author = Column(String(100), default="Security Analyst")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    note_text = Column(Text, nullable=False)

    alert = relationship("Alert", back_populates="notes")

class LogSource(Base):
    __tablename__ = "log_sources"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    source_type = Column(String(100), default="Windows Security")
    hostname = Column(String(100), default="SEC-DC01.CORP.LOCAL")
    status = Column(String(30), default="Demo Mode")  # Live, Not Connected, Demo Mode, Ingesting
    last_event_time = Column(DateTime, nullable=True)
    event_count = Column(Integer, default=0)
    origin = Column(String(20), default="Simulated")  # Real or Simulated
    config_details = Column(Text, default="{}")  # JSON metadata

class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
