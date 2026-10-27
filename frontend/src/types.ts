export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
export type AlertStatus = 'New' | 'In Progress' | 'Resolved' | 'Dismissed';
export type EventOrigin = 'Real' | 'Simulated';
export type LogSourceStatus = 'Live' | 'Not Connected' | 'Demo Mode' | 'Ingesting';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  source_type: string;
  hostname: string;
  source_ip?: string | null;
  destination_ip?: string | null;
  username?: string | null;
  event_category: string;
  event_id?: number | null;
  description: string;
  severity: SeverityLevel;
  origin: EventOrigin;
  related_rule_id?: string | null;
  raw_data?: Record<string, any>;
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: SeverityLevel;
  is_enabled: boolean;
  rule_type: string;
  threshold: number;
  time_window_seconds: number;
  group_by: string;
  conditions: Record<string, any>;
  alerts_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface InvestigationNote {
  id: number;
  author: string;
  timestamp: string;
  note_text: string;
}

export interface SecurityAlert {
  id: string;
  title: string;
  severity: SeverityLevel;
  rule_id?: string | null;
  rule_name: string;
  timestamp: string;
  target_account?: string | null;
  source_ip?: string | null;
  hostname?: string | null;
  status: AlertStatus;
  summary: string;
  evidence_count?: number;
  evidence_event_ids?: string[];
  assigned_to: string;
  resolution_summary?: string;
  created_at?: string;
  updated_at?: string;
  evidence_events?: SecurityEvent[];
  notes?: InvestigationNote[];
  rule_info?: {
    id: string;
    name: string;
    description: string;
    threshold: number;
    time_window_seconds: number;
    group_by: string;
  };
}

export interface LogSource {
  id: string;
  name: string;
  source_type: string;
  hostname: string;
  status: LogSourceStatus;
  last_event_time?: string | null;
  event_count: number;
  origin: EventOrigin;
  config_details?: Record<string, any>;
}

export interface OverviewData {
  summary: {
    total_events: number;
    critical_alerts: number;
    high_alerts: number;
    open_investigations: number;
    active_sources: number;
    triggered_rules: number;
  };
  severity_distribution: Record<string, number>;
  event_categories: Array<{ category: string; count: number }>;
  top_sources: Array<{ hostname: string; count: number }>;
  top_rules: Array<{ id: string; name: string; severity: SeverityLevel; count: number }>;
  events_over_time: Array<{ time: string; events: number; alerts: number }>;
  recent_alerts: Array<{
    id: string;
    timestamp: string;
    severity: SeverityLevel;
    title: string;
    rule_name: string;
    status: AlertStatus;
    source_ip?: string;
    target_account?: string;
    hostname?: string;
  }>;
}

export interface ReportSummary {
  time_range: string;
  total_events: number;
  total_alerts: number;
  alerts_by_severity: Record<string, number>;
  alerts_by_status: Record<string, number>;
  alerts_by_rule: Array<{ rule_name: string; severity: SeverityLevel; count: number }>;
  top_hosts: Array<{ hostname: string; count: number }>;
  resolved_findings: Array<{
    id: string;
    title: string;
    resolved_at: string;
    resolution: string;
  }>;
}
