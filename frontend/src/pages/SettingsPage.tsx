import React, { useState, useEffect } from 'react';
import { useApp, TimeRange } from '../context/AppContext';
import { Modal } from '../components/UI/Modal';
import {
  Settings,
  Moon,
  Sun,
  Database,
  Key,
  User,
  Clock,
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme, timeRange, setTimeRange, showToast, triggerRefresh } = useApp();

  const [settings, setSettings] = useState<Record<string, string>>({
    theme: theme,
    default_time_range: timeRange,
    retention_days: '30',
    analyst_name: 'Analyst Yashaswini',
    analyst_email: 'yashaswini.soc@corp.local',
    auto_eval_interval: '60',
    ingest_api_token: 'siem-token-sec-demo-9921'
  });

  const [saving, setSaving] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const json = await res.json();
          setSettings(prev => ({ ...prev, ...json }));
        }
      } catch (err) {
        // use defaults
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Failed to save settings');
      showToast('Settings saved successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error saving settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDatabase = async () => {
    try {
      setResetting(true);
      const res = await fetch('/api/database/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      showToast('Database reset and fresh demonstration baseline seeded!', 'success');
      setResetModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'Error resetting database', 'error');
    } finally {
      setResetting(false);
    }
  };

  const handleGenerateToken = () => {
    const newToken = `siem-token-${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`;
    setSettings(prev => ({ ...prev, ingest_api_token: newToken }));
    showToast('Generated new ingestion API token', 'info');
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto max-w-4xl mx-auto w-full">
      {/* Settings Header */}
      <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Settings className="w-4 h-4 text-blue-500" />
          System & Platform Settings
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Configure analyst profiles, telemetry retention limits, authentication tokens, and appearance.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance & Interface */}
        <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-500" /> User Interface & Theme
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Color Theme</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] flex items-center gap-2 transition"
                >
                  {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-blue-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  <span>Active: <strong>{theme === 'dark' ? 'Charcoal Gray Dark' : 'Pure White Light'}</strong></span>
                </button>
              </div>
              <span className="text-[10.5px] text-[var(--text-muted)] mt-1 block">
                Dark theme uses a charcoal gray palette (#202124 / #303134) rather than pure black.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Default Telemetry Window</label>
              <select
                value={timeRange}
                onChange={(e) => {
                  setTimeRange(e.target.value as TimeRange);
                  setSettings(prev => ({ ...prev, default_time_range: e.target.value }));
                }}
                className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
              >
                <option value="15m">Last 15 Minutes</option>
                <option value="1h">Last 1 Hour</option>
                <option value="24h">Last 24 Hours (Recommended)</option>
                <option value="7d">Last 7 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Analyst Profile */}
        <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-500" /> Analyst Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Analyst Full Name</label>
              <input
                type="text"
                value={settings.analyst_name}
                onChange={(e) => setSettings(prev => ({ ...prev, analyst_name: e.target.value }))}
                className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">SOC Email Address</label>
              <input
                type="email"
                value={settings.analyst_email}
                onChange={(e) => setSettings(prev => ({ ...prev, analyst_email: e.target.value }))}
                className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                required
              />
            </div>
          </div>
        </div>

        {/* Telemetry Storage & Retention */}
        <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-500" /> Retention Policy & Engine Schedule
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Event Retention Period (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.retention_days}
                onChange={(e) => setSettings(prev => ({ ...prev, retention_days: e.target.value }))}
                className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
              />
              <span className="text-[10.5px] text-[var(--text-muted)] mt-0.5 block">
                Automatic purging interval for archived events
              </span>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Rule Engine Auto-Evaluation (Sec)</label>
              <input
                type="number"
                min="10"
                max="600"
                value={settings.auto_eval_interval}
                onChange={(e) => setSettings(prev => ({ ...prev, auto_eval_interval: e.target.value }))}
                className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
              />
              <span className="text-[10.5px] text-[var(--text-muted)] mt-0.5 block">
                Sliding detection interval across active windows
              </span>
            </div>
          </div>
        </div>

        {/* Ingestion Security & Token */}
        <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-blue-500" /> Ingestion API Key & Forwarder Authentication
          </h3>

          <div className="space-y-2 text-xs">
            <label className="block font-semibold text-[var(--text-primary)]">Collector Authentication Token</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={settings.ingest_api_token}
                className="flex-1 px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--table-stripe)] font-mono text-[var(--text-primary)] text-xs"
              />
              <button
                type="button"
                onClick={handleGenerateToken}
                className="px-3 py-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] font-medium text-xs cursor-pointer"
              >
                Regenerate Token
              </button>
            </div>
            <span className="text-[10.5px] text-[var(--text-muted)]">
              Forwarders like <code>collector.ps1</code> or Python agents include this token in HTTP headers.
            </span>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded text-xs font-semibold bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving Settings...' : 'Save Configuration'}
          </button>
        </div>
      </form>

      {/* Danger Zone / Reset Database */}
      <div className="p-5 rounded border border-red-200 bg-red-50/40 dark:bg-red-950/20 dark:border-red-900/40 space-y-3">
        <h3 className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" /> Demonstration Data Maintenance
        </h3>
        <p className="text-xs text-[var(--text-secondary)]">
          Cleanly purge all ingested events, clear generated alerts, and reseed a pristine demonstration baseline.
        </p>
        <button
          type="button"
          onClick={() => setResetModalOpen(true)}
          className="px-3.5 py-1.5 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Database & Reseed Demo Baseline
        </button>
      </div>

      {/* Confirmation Modal */}
      {resetModalOpen && (
        <Modal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          title="Confirm Database Reset"
          subtitle="Are you sure you want to reset all security monitoring data?"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <p className="text-[var(--text-primary)] leading-relaxed">
              This action will delete all existing events and investigation notes, and reload the original 6 detection rules and initial baseline activity.
            </p>
            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-3 py-1.5 rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetDatabase}
                disabled={resetting}
                className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 font-semibold flex items-center gap-1.5"
              >
                {resetting ? 'Resetting...' : 'Yes, Reset Database'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
