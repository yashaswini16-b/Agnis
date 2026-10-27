from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class EventBase(BaseModel):
    id: Optional[str] = None
    timestamp: Optional[datetime] = None
    source_type: str = "Windows Security Log"
    hostname: str = "SEC-DC01.CORP.LOCAL"
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    username: Optional[str] = None
    event_category: str = "Authentication"
    event_id: Optional[int] = None
    description: str = ""
    severity: str = "Low"
    raw_data: Optional[Dict[str, Any]] = None
    origin: str = "Simulated"  # Real or Simulated

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    created_at: Optional[datetime] = None
    related_rule_id: Optional[str] = None

    class Config:
        from_attributes = True

class InvestigationNoteCreate(BaseModel):
    author: Optional[str] = "Security Analyst"
    note_text: str

class InvestigationNoteResponse(BaseModel):
    id: int
    alert_id: str
    author: str
    timestamp: datetime
    note_text: str

    class Config:
        from_attributes = True

class AlertResponse(BaseModel):
    id: str
    title: str
    severity: str
    rule_id: Optional[str] = None
    rule_name: str
    timestamp: datetime
    target_account: Optional[str] = None
    source_ip: Optional[str] = None
    hostname: Optional[str] = None
    status: str
    summary: str
    evidence_event_ids: List[str] = []
    assigned_to: str
    resolution_summary: str
    created_at: datetime
    updated_at: datetime
    notes: List[InvestigationNoteResponse] = []

    class Config:
        from_attributes = True

class AlertUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution_summary: Optional[str] = None

class DetectionRuleBase(BaseModel):
    id: str
    name: str
    description: str
    severity: str
    is_enabled: bool = True
    rule_type: str
    threshold: int = 5
    time_window_seconds: int = 300
    group_by: str = "source_ip"
    conditions: Dict[str, Any] = {}

class DetectionRuleCreate(DetectionRuleBase):
    pass

class DetectionRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    is_enabled: Optional[bool] = None
    threshold: Optional[int] = None
    time_window_seconds: Optional[int] = None
    group_by: Optional[str] = None
    conditions: Optional[Dict[str, Any]] = None

class DetectionRuleResponse(DetectionRuleBase):
    alerts_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LogSourceResponse(BaseModel):
    id: str
    name: str
    source_type: str
    hostname: str
    status: str
    last_event_time: Optional[datetime] = None
    event_count: int
    origin: str
    config_details: Dict[str, Any] = {}

    class Config:
        from_attributes = True

class ScenarioRequest(BaseModel):
    scenario: str  # failed_logins, login_after_failures, account_lockout, powershell_obfuscation, multiple_accounts_one_ip, normal_activity
    target_user: Optional[str] = "admin"
    source_ip: Optional[str] = "192.168.1.105"
    count: Optional[int] = None

class IngestionBatchRequest(BaseModel):
    events: List[EventCreate]
    origin: Optional[str] = "Simulated"
