import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SecurityAlert, SecurityEvent, AlertStatus } from '../types';
import { SeverityBadge, StatusBadge, OriginBadge } from '../components/UI/Badges';
import {
  FolderSearch,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  User,
  Globe,
  Server,
  FileText,
  Send,
  Calendar,
  Shield,
  HelpCircle,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';

export const InvestigationWorkspacePage: React.FC = () => {
  const { activeAlertId, setCurrentPage, refreshTrigger, showToast } = useApp();

  const [alertsList, setAlertsList] = useState<SecurityAlert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(activeAlertId);
  const [alertDetail, setAlertDetail] = useState<SecurityAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Note form state
  const [noteAuthor, setNoteAuthor] = useState('Analyst Yashaswini');
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Resolution state
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [savingResolution, setSavingResolution] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch alerts list for sidebar selection
  useEffect(() => {
    const fetchAlertsList = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/alerts?page_size=50');
        if (!res.ok) throw new Error('Failed to load alerts');
        const data = await res.json();
        setAlertsList(data.items || []);

        // Default to first alert or activeAlertId
        if (activeAlertId) {
          setSelectedAlertId(activeAlertId);
        } else if (data.items && data.items.length > 0 && !selectedAlertId) {
          setSelectedAlertId(data.items[0].id);
        }
      } catch (err: any) {
        showToast(err.message || 'Error loading alerts', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchAlertsList();
  }, [activeAlertId, refreshTrigger]);

  // Fetch full alert details when selectedAlertId changes
  const fetchAlertDetail = async (id: string) => {
    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/alerts/${id}`);
      if (!res.ok) throw new Error('Failed to load alert details');
      const data = await res.json();
      setAlertDetail(data);
      setResolutionSummary(data.resolution_summary || '');
    } catch (err: any) {
      showToast(err.message || 'Error loading alert details', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedAlertId) {
      fetchAlertDetail(selectedAlertId);
    }
  }, [selectedAlertId]);

  const handleStatusChange = async (newStatus: AlertStatus) => {
    if (!selectedAlertId) return;
    try {
      const res = await fetch(`/api/alerts/${selectedAlertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      showToast(`Status updated to ${newStatus}`, 'success');
      fetchAlertDetail(selectedAlertId);
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertId || !noteText.trim()) return;

    try {
      setAddingNote(true);
      const res = await fetch(`/api/alerts/${selectedAlertId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: noteAuthor,
          note_text: noteText.trim()
        })
      });
      if (!res.ok) throw new Error('Failed to save investigation note');
      showToast('Investigation note recorded', 'success');
      setNoteText('');
      fetchAlertDetail(selectedAlertId);
    } catch (err: any) {
      showToast(err.message || 'Failed to add note', 'error');
    } finally {
      setAddingNote(false);
    }
  };

  const handleSaveResolution = async () => {
    if (!selectedAlertId) return;
    try {
      setSavingResolution(true);
      const res = await fetch(`/api/alerts/${selectedAlertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_summary: resolutionSummary,
          status: 'Resolved'
        })
      });
      if (!res.ok) throw new Error('Failed to save resolution');
      showToast('Incident marked Resolved with findings', 'success');
      fetchAlertDetail(selectedAlertId);
    } catch (err: any) {
      showToast(err.message || 'Error saving resolution', 'error');
    } finally {
      setSavingResolution(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
    showToast(`Copied ${key} to clipboard`, 'info');
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Alert List Sidebar (Triage Queue) */}
      <div className="w-72 border-r border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col shrink-0 select-none">
        <div className="p-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-primary)]">Triage Queue</span>
          <span className="text-[11px] font-mono text-[var(--text-secondary)]">{alertsList.length} alerts</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {loading && alertsList.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-secondary)]">
              <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[var(--accent-blue)] mb-2" />
              Loading alerts queue...
            </div>
          ) : alertsList.length > 0 ? (
            alertsList.map((a) => {
              const isSelected = selectedAlertId === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAlertId(a.id)}
                  className={`w-full text-left p-3 transition flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-blue-subtle)] border-l-3 border-[var(--accent-blue)]'
                      : 'hover:bg-[var(--table-hover)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity={a.severity} />
                    <span className="text-[10.5px] font-mono text-[var(--text-muted)]">
                      {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-[var(--text-primary)] truncate mt-0.5">
                    {a.title}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] truncate">
                    {a.target_account ? `User: ${a.target_account}` : (a.source_ip ? `IP: ${a.source_ip}` : a.hostname)}
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] mt-1 pt-1 border-t border-[var(--border-subtle)] text-[var(--text-muted)]">
                    <span className="font-mono">{a.id}</span>
                    <StatusBadge status={a.status} />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-[var(--text-muted)]">
              No alerts in queue.
            </div>
          )}
        </div>
      </div>

      {/* Main Investigation Workspace Area */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-[var(--bg-app)]">
        {loadingDetail && !alertDetail ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <RefreshCw className="w-5 h-5 animate-spin text-[var(--accent-blue)] mr-2" />
            <span className="text-sm text-[var(--text-secondary)]">Retrieving incident telemetry and evidence...</span>
          </div>
        ) : alertDetail ? (
          <div className="p-6 space-y-5 max-w-6xl mx-auto w-full">
            {/* Top Incident Banner & Controls */}
            <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[var(--accent-blue)]">{alertDetail.id}</span>
                    <SeverityBadge severity={alertDetail.severity} />
                    <StatusBadge status={alertDetail.status} />
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      Triggered {new Date(alertDetail.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                    {alertDetail.title}
                  </h2>
                </div>

                {/* Status Changer Actions */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)] font-medium">Triage Status:</span>
                  <select
                    value={alertDetail.status}
                    onChange={(e) => handleStatusChange(e.target.value as AlertStatus)}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-hidden"
                  >
                    <option value="New">New (Unreviewed)</option>
                    <option value="In Progress">In Progress (Active)</option>
                    <option value="Resolved">Resolved (Closed)</option>
                    <option value="Dismissed">Dismissed (False Positive)</option>
                  </select>
                </div>
              </div>

              {/* Distinction Banner: Rule Inference vs Confirmed Incident */}
              <div className="p-3 rounded border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900/50 text-[11.5px] text-blue-900 dark:text-blue-300 flex items-start gap-2 leading-relaxed">
                <HelpCircle className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <strong>SOC Operating Principle:</strong> This alert represents a rule-based anomaly indicator evaluated against configured thresholds. Suspicious activity does not automatically prove an attack occurred; conclusion requires verification of observed facts and evidence below.
                </div>
              </div>

              {/* Observed Entities Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Target Account</span>
                      <span className="font-semibold text-xs text-[var(--text-primary)]">{alertDetail.target_account || 'N/A'}</span>
                    </div>
                  </div>
                  {alertDetail.target_account && (
                    <button
                      onClick={() => handleCopy(alertDetail.target_account!, 'user')}
                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {copiedKey === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-500" />
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Source IP</span>
                      <span className="font-mono font-semibold text-xs text-[var(--text-primary)]">{alertDetail.source_ip || 'N/A'}</span>
                    </div>
                  </div>
                  {alertDetail.source_ip && (
                    <button
                      onClick={() => handleCopy(alertDetail.source_ip!, 'ip')}
                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {copiedKey === 'ip' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-purple-500" />
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Observed Host</span>
                      <span className="font-mono font-semibold text-xs text-[var(--text-primary)]">{alertDetail.hostname || 'N/A'}</span>
                    </div>
                  </div>
                  {alertDetail.hostname && (
                    <button
                      onClick={() => handleCopy(alertDetail.hostname!, 'host')}
                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {copiedKey === 'host' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Trigger Reason & Rule Logic Card */}
            <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-2">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-500" /> Triggering Detection Rule & Observation Rationale
              </h3>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                {alertDetail.summary}
              </p>
              {alertDetail.rule_info && (
                <div className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex flex-wrap gap-4">
                  <span>Rule: <strong>{alertDetail.rule_info.name}</strong> ({alertDetail.rule_info.id})</span>
                  <span>Threshold: <strong>&ge; {alertDetail.rule_info.threshold} events</strong></span>
                  <span>Window: <strong>{alertDetail.rule_info.time_window_seconds}s</strong></span>
                  <span>Grouping: <strong>{alertDetail.rule_info.group_by}</strong></span>
                </div>
              )}
            </div>

            {/* Interactive Timeline of Observed Evidence */}
            <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" /> Chronological Evidence Timeline
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">Sequence of {alertDetail.evidence_events?.length || 0} events qualifying for this detection</p>
                </div>
              </div>

              {/* Timeline Items */}
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-subtle)]">
                {(alertDetail.evidence_events || []).map((evt, idx) => (
                  <div key={evt.id} className="relative group">
                    {/* Timeline bullet dot */}
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-[var(--bg-card)] shadow-xs"></div>
                    <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-semibold text-[var(--accent-blue)]">
                            Event {idx + 1}: Win Event ID {evt.event_id || 'Audit'}
                          </span>
                          <SeverityBadge severity={evt.severity} />
                          <OriginBadge origin={evt.origin} />
                        </div>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="font-medium text-[var(--text-primary)]">
                        {evt.description}
                      </p>
                      <div className="text-[11px] font-mono text-[var(--text-secondary)] flex flex-wrap gap-3">
                        <span>Host: {evt.hostname}</span>
                        {evt.username && <span>User: {evt.username}</span>}
                        {evt.source_ip && <span>IP: {evt.source_ip}</span>}
                      </div>

                      {/* Raw Details expansion */}
                      {evt.raw_data && Object.keys(evt.raw_data).length > 0 && (
                        <details className="mt-2 text-[10.5px]">
                          <summary className="cursor-pointer text-[var(--accent-blue)] hover:underline select-none">
                            View Normalized Event Telemetry
                          </summary>
                          <pre className="mt-1 p-2 rounded bg-[var(--table-stripe)] border border-[var(--border-subtle)] text-[10px] font-mono overflow-x-auto">
                            {JSON.stringify(evt.raw_data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analyst Notes Log & Recording Form */}
            <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-500" /> Analyst Investigation Notes & Audit Log
              </h3>

              {/* Notes List */}
              <div className="space-y-2">
                {(alertDetail.notes || []).length > 0 ? (
                  alertDetail.notes?.map((n) => (
                    <div key={n.id} className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                        <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                          <User className="w-3 h-3 text-blue-500" /> {n.author}
                        </span>
                        <span className="font-mono">{new Date(n.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-[var(--text-primary)] whitespace-pre-line leading-relaxed">{n.note_text}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-center text-xs text-[var(--text-muted)]">
                    No analyst notes logged yet. Record your preliminary findings and investigation steps below.
                  </div>
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={noteAuthor}
                    onChange={(e) => setNoteAuthor(e.target.value)}
                    placeholder="Analyst Name"
                    className="w-48 px-2.5 py-1 rounded text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)]"
                  />
                  <span className="text-[11px] text-[var(--text-muted)]">Recording as SOC Analyst</span>
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Record observed patterns, IP reputation lookup results, firewall correlations, or mitigation steps..."
                  rows={2}
                  className="w-full px-3 py-2 rounded text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-hidden"
                  required
                />
                <button
                  type="submit"
                  disabled={addingNote || !noteText.trim()}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3 h-3" /> Save Analyst Note
                </button>
              </form>
            </div>

            {/* Resolution & Closing Workflow */}
            <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-3">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Incident Resolution & Closure Findings
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Record your final findings, root cause determination, and incident resolution status.
              </p>
              <textarea
                value={resolutionSummary}
                onChange={(e) => setResolutionSummary(e.target.value)}
                placeholder="Example: Confirmed password guessing attempt from external VPN IP. Target user verified credentials remained uncompromised. Account lockout policy successfully throttled further attempts. Incident closed."
                rows={3}
                className="w-full px-3 py-2 rounded text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-hidden"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)]">
                  Saving will mark the alert status as <strong>Resolved</strong> in the database.
                </span>
                <button
                  onClick={handleSaveResolution}
                  disabled={savingResolution || !resolutionSummary.trim()}
                  className="px-4 py-1.5 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save Findings & Mark Resolved
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--text-muted)] space-y-2">
            <FolderSearch className="w-8 h-8 text-[var(--text-secondary)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">No Alert Selected</p>
            <p className="text-xs max-w-sm">Select an alert from the triage queue on the left to inspect its evidence and document findings.</p>
          </div>
        )}
      </div>
    </div>
  );
};
