import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DetectionRule, SeverityLevel } from '../types';
import { SeverityBadge } from '../components/UI/Badges';
import { Modal } from '../components/UI/Modal';
import {
  ShieldAlert,
  Play,
  Edit2,
  Plus,
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText
} from 'lucide-react';

export const DetectionRulesPage: React.FC = () => {
  const { refreshTrigger, showToast } = useApp();

  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [loading, setLoading] = useState(false);

  // Test Rule Modal
  const [testingRule, setTestingRule] = useState<DetectionRule | null>(null);
  const [testResults, setTestResults] = useState<any | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Edit Rule Modal
  const [editingRule, setEditingRule] = useState<DetectionRule | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSeverity, setEditSeverity] = useState<SeverityLevel>('Medium');
  const [editThreshold, setEditThreshold] = useState(5);
  const [editWindow, setEditWindow] = useState(300);
  const [editGroupBy, setEditGroupBy] = useState('source_ip');

  // Create Custom Rule Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [customId, setCustomId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customSeverity, setCustomSeverity] = useState<SeverityLevel>('Medium');
  const [customThreshold, setCustomThreshold] = useState(3);
  const [customWindow, setCustomWindow] = useState(300);
  const [customField, setCustomField] = useState('event_category');
  const [customMatchValue, setCustomMatchValue] = useState('Authentication');

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rules');
      if (!res.ok) throw new Error('Failed to load detection rules');
      const data = await res.json();
      setRules(data);
    } catch (err: any) {
      showToast(err.message || 'Error fetching rules', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [refreshTrigger]);

  const handleToggleRule = async (rule: DetectionRule) => {
    try {
      const res = await fetch(`/api/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !rule.is_enabled })
      });
      if (!res.ok) throw new Error('Failed to update rule');
      showToast(`Rule ${rule.id} ${!rule.is_enabled ? 'enabled' : 'disabled'}`, 'info');
      fetchRules();
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle rule', 'error');
    }
  };

  const handleOpenEdit = (rule: DetectionRule) => {
    setEditingRule(rule);
    setEditName(rule.name);
    setEditDesc(rule.description);
    setEditSeverity(rule.severity);
    setEditThreshold(rule.threshold);
    setEditWindow(rule.time_window_seconds);
    setEditGroupBy(rule.group_by);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const res = await fetch(`/api/rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          severity: editSeverity,
          threshold: editThreshold,
          time_window_seconds: editWindow,
          group_by: editGroupBy
        })
      });
      if (!res.ok) throw new Error('Failed to save rule configuration');
      showToast(`Rule ${editingRule.id} updated successfully`, 'success');
      setEditingRule(null);
      fetchRules();
    } catch (err: any) {
      showToast(err.message || 'Failed to save rule', 'error');
    }
  };

  const handleTestRule = async (rule: DetectionRule) => {
    setTestingRule(rule);
    setTestLoading(true);
    setTestResults(null);
    try {
      const res = await fetch(`/api/rules/${rule.id}/test`, { method: 'POST' });
      if (!res.ok) throw new Error('Rule evaluation test failed');
      const data = await res.json();
      setTestResults(data);
    } catch (err: any) {
      showToast(err.message || 'Test execution failed', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  const handleCreateCustomRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ruleId = customId.trim() || `RULE-${Math.floor(100 + Math.random() * 900)}`;
      const payload = {
        id: ruleId,
        name: customName,
        description: customDesc,
        severity: customSeverity,
        is_enabled: true,
        rule_type: 'custom',
        threshold: customThreshold,
        time_window_seconds: customWindow,
        group_by: 'account',
        conditions: {
          field: customField,
          value: customMatchValue
        }
      };

      const res = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'Failed to create rule');
      }
      showToast(`Custom rule ${ruleId} created successfully`, 'success');
      setCreateModalOpen(false);
      setCustomId('');
      setCustomName('');
      setCustomDesc('');
      fetchRules();
    } catch (err: any) {
      showToast(err.message || 'Error creating rule', 'error');
    }
  };

  return (
    <div className="flex-1 p-6 space-y-5 overflow-y-auto">
      {/* Engine Overview Header */}
      <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-500" />
            Configurable SIEM Detection Engine
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time correlation rules analyzing telemetry windows, sliding thresholds, and behavioral anomalies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRules}
            className="px-3 py-1.5 rounded text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Rules
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3 py-1.5 rounded text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Create Custom Rule
          </button>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => {
          return (
            <div
              key={rule.id}
              className={`p-4 rounded border transition-all ${
                rule.is_enabled
                  ? 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] opacity-70'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[var(--accent-blue)]">{rule.id}</span>
                    <SeverityBadge severity={rule.severity} />
                    <span className="text-[10.5px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      {rule.rule_type}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1.5">
                    {rule.name}
                  </h3>
                </div>

                {/* Enable/Disable Toggle Switch */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleRule(rule)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      rule.is_enabled ? 'bg-emerald-600' : 'bg-gray-400 dark:bg-gray-600'
                    }`}
                    title={rule.is_enabled ? 'Click to disable' : 'Click to enable'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        rule.is_enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                {rule.description}
              </p>

              {/* Parameters Strip */}
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-2 text-[11px] text-[var(--text-secondary)]">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Threshold</span>
                  <span className="font-semibold text-[var(--text-primary)]">&ge; {rule.threshold} events</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Time Window</span>
                  <span className="font-semibold text-[var(--text-primary)]">{rule.time_window_seconds} seconds</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">Group By</span>
                  <span className="font-semibold text-[var(--text-primary)]">{rule.group_by}</span>
                </div>
              </div>

              {/* Action buttons & Stats */}
              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <div className="text-[11px] text-[var(--text-secondary)]">
                  Triggered: <strong className="text-[var(--text-primary)]">{rule.alerts_count || 0}</strong> alerts
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestRule(rule)}
                    className="px-2.5 py-1 rounded text-[11px] font-medium border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] transition flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3 text-emerald-500" /> Test Rule
                  </button>
                  <button
                    onClick={() => handleOpenEdit(rule)}
                    className="px-2.5 py-1 rounded text-[11px] font-medium border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] transition flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-[var(--accent-blue)]" /> Edit
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Test Rule Results Modal */}
      {testingRule && (
        <Modal
          isOpen={!!testingRule}
          onClose={() => setTestingRule(null)}
          title={`Detection Test: ${testingRule.name}`}
          subtitle={`Executing rule logic against recent live and simulated telemetry`}
          maxWidth="max-w-2xl"
        >
          {testLoading ? (
            <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[var(--accent-blue)] mb-2" />
              Scanning event corpus and evaluating sliding window conditions...
            </div>
          ) : testResults ? (
            <div className="space-y-4 text-xs">
              {/* Test summary banner */}
              <div
                className={`p-3 rounded border flex items-center justify-between ${
                  testResults.would_trigger
                    ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResults.would_trigger ? (
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <div>
                    <span className="font-semibold">
                      {testResults.would_trigger
                        ? `Threshold Met: Rule would trigger ${testResults.alert_count} alert(s)`
                        : 'No Alert: Threshold not reached under current conditions'}
                    </span>
                    <p className="text-[11px] opacity-80">
                      Evaluated {testResults.evaluated_events_count} recent events in event store.
                    </p>
                  </div>
                </div>
              </div>

              {/* Alert previews if any */}
              {testResults.simulated_alerts && testResults.simulated_alerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-[var(--text-primary)]">Simulated Alert Previews:</h4>
                  {testResults.simulated_alerts.map((sa: any, idx: number) => (
                    <div key={idx} className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--text-primary)]">{sa.title}</span>
                        <SeverityBadge severity={sa.severity} />
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">{sa.summary}</p>
                      <div className="text-[10.5px] text-[var(--text-muted)]">
                        Correlated Evidence: <strong>{sa.evidence_count}</strong> qualifying events
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      )}

      {/* Edit Rule Configuration Modal */}
      {editingRule && (
        <Modal
          isOpen={!!editingRule}
          onClose={() => setEditingRule(null)}
          title={`Configure Rule: ${editingRule.id}`}
          subtitle="Adjust detection thresholds, time windows, and target grouping"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Rule Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Severity</label>
                <select
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(e.target.value as SeverityLevel)}
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Group By Field</label>
                <select
                  value={editGroupBy}
                  onChange={(e) => setEditGroupBy(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                >
                  <option value="source_ip">Source IP Address</option>
                  <option value="account">Target User Account</option>
                  <option value="both">Both IP & Account</option>
                  <option value="host">Hostname</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Event Threshold Count</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editThreshold}
                  onChange={(e) => setEditThreshold(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                  required
                />
                <span className="text-[10px] text-[var(--text-muted)]">Minimum events required to alert</span>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Sliding Time Window (Sec)</label>
                <input
                  type="number"
                  min="10"
                  max="3600"
                  value={editWindow}
                  onChange={(e) => setEditWindow(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                  required
                />
                <span className="text-[10px] text-[var(--text-muted)]">Time window to evaluate threshold (e.g. 300s = 5m)</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRule(null)}
                className="px-3 py-1.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] font-medium"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Custom Rule Modal */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Custom Detection Rule"
          subtitle="Define a custom rule with field pattern matching and threshold triggers"
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleCreateCustomRule} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Rule ID</label>
                <input
                  type="text"
                  placeholder="e.g. RULE-CUSTOM-01"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Severity</label>
                <select
                  value={customSeverity}
                  onChange={(e) => setCustomSeverity(e.target.value as SeverityLevel)}
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Rule Name</label>
              <input
                type="text"
                placeholder="e.g. Multiple Cleartext Logons Detected"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Description</label>
              <textarea
                placeholder="Detailed rationale for this detection..."
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Match Field</label>
                <select
                  value={customField}
                  onChange={(e) => setCustomField(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                >
                  <option value="event_category">Category</option>
                  <option value="description">Description</option>
                  <option value="hostname">Hostname</option>
                  <option value="username">Username</option>
                  <option value="source_type">Source Type</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Value Contains</label>
                <input
                  type="text"
                  placeholder="e.g. Privilege Escalation"
                  value={customMatchValue}
                  onChange={(e) => setCustomMatchValue(e.target.value)}
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Threshold</label>
                <input
                  type="number"
                  min="1"
                  value={customThreshold}
                  onChange={(e) => setCustomThreshold(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Time Window (s)</label>
                <input
                  type="number"
                  min="10"
                  value={customWindow}
                  onChange={(e) => setCustomWindow(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-3 py-1.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] font-medium"
              >
                Create Rule
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
