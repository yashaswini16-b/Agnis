import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { LogSource, EventOrigin } from '../types';
import { OriginBadge } from '../components/UI/Badges';
import { Modal } from '../components/UI/Modal';
import {
  Server,
  Terminal,
  Upload,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
  ShieldAlert,
  FileCode,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  TestTube
} from 'lucide-react';

export const LogSourcesPage: React.FC = () => {
  const { refreshTrigger, triggerRefresh, showToast, setCurrentPage } = useApp();

  const [sources, setSources] = useState<LogSource[]>([]);
  const [loading, setLoading] = useState(false);

  // Scenario Generator state
  const [scenarioType, setScenarioType] = useState('failed_logins');
  const [targetUser, setTargetUser] = useState('administrator');
  const [sourceIp, setSourceIp] = useState('192.168.1.185');
  const [eventCount, setEventCount] = useState(6);
  const [generating, setGenerating] = useState(false);

  // File Import state
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collector Setup Guide Modal
  const [collectorModalOpen, setCollectorModalOpen] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/log-sources');
      if (!res.ok) throw new Error('Failed to load log sources');
      const data = await res.json();
      setSources(data);
    } catch (err: any) {
      showToast(err.message || 'Error fetching sources', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [refreshTrigger]);

  const handleGenerateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const res = await fetch('/api/scenarios/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: scenarioType,
          target_user: targetUser,
          source_ip: sourceIp,
          count: eventCount
        })
      });
      if (!res.ok) throw new Error('Simulation execution failed');
      const data = await res.json();
      showToast(
        `Generated ${data.events_created} simulated events. Triggered ${data.alerts_triggered} new alerts!`,
        'success'
      );
      triggerRefresh();
      fetchSources();
    } catch (err: any) {
      showToast(err.message || 'Error generating scenario', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('origin', 'Simulated');

    try {
      setImporting(true);
      const res = await fetch('/api/events/import/file', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || 'File ingestion failed');
      }
      const data = await res.json();
      showToast(`Successfully ingested ${data.ingested_count} events from ${file.name}. Generated ${data.alerts_generated} alerts.`, 'success');
      triggerRefresh();
      fetchSources();
    } catch (err: any) {
      showToast(err.message || 'Error importing file', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopy = (cmd: string, key: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
    showToast('Command copied to clipboard', 'info');
  };

  const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -File "d:\\yashaswini project\\backend\\collector.ps1"`;
  const pyCommand = `python "d:\\yashaswini project\\backend\\windows_collector.py"`;

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Real vs Simulated Telemetry Notice */}
      <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Log Sources & Telemetry Pipeline</h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Data collection points, telemetry forwarders, JSON/CSV ingestors, and test scenario generators.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollectorModalOpen(true)}
            className="px-3 py-1.5 rounded text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] transition flex items-center gap-1.5 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-500" /> Windows Collector Setup Guide
          </button>
          <button
            onClick={fetchSources}
            className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-secondary)] transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sources.map((src) => {
          const isLive = src.status === 'Live';
          const isDemo = src.status === 'Demo Mode';
          const isDisconnected = src.status === 'Not Connected';

          return (
            <div
              key={src.id}
              className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-[var(--text-muted)]">{src.id}</span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isLive ? 'bg-emerald-500 animate-pulse' : isDemo ? 'bg-purple-500' : 'bg-gray-400'
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        isLive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isDemo
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-500'
                      }`}
                    >
                      {src.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-1.5">
                  {src.name}
                </h3>
                <div className="text-[11px] font-mono text-[var(--text-secondary)] mt-0.5">
                  {src.hostname}
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center justify-between">
                  <span>Type:</span>
                  <span className="font-medium text-[var(--text-primary)]">{src.source_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Origin:</span>
                  <OriginBadge origin={src.origin} />
                </div>
                <div className="flex items-center justify-between">
                  <span>Events Ingested:</span>
                  <span className="font-mono font-semibold text-[var(--text-primary)]">{src.event_count.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>Last Event:</span>
                  <span>{src.last_event_time ? new Date(src.last_event_time).toLocaleTimeString() : 'Never'}</span>
                </div>
              </div>

              {src.id === 'SRC-004' && isDisconnected && (
                <button
                  onClick={() => setCollectorModalOpen(true)}
                  className="w-full mt-2 py-1.5 rounded text-xs font-medium bg-[var(--accent-blue-subtle)] text-[var(--accent-blue)] border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition cursor-pointer"
                >
                  Connect Real Windows Agent
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Two Column Ingestion Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Simulated Scenario Generator */}
        <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-purple-500" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Demonstration Scenario Generator</h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Synthesize realistic security event patterns to demonstrate detection rules and analyst triage.
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerateScenario} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Select Attack Scenario</label>
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
              >
                <option value="failed_logins">Repeated Failed Logins (Brute Force - Triggers Rule 1)</option>
                <option value="login_after_failures">Successful Login After Repeated Failures (Compromise - Triggers Rule 2)</option>
                <option value="account_lockout">Account Lockout Spike (Excessive Failures - Triggers Rule 3)</option>
                <option value="suspicious_powershell">Suspicious PowerShell Obfuscation & Bypass (Living-off-the-Land - Triggers Rule 4)</option>
                <option value="privileged_activity">Unusual Privileged Account Activity (Admin Anomaly - Triggers Rule 5)</option>
                <option value="multiple_accounts_one_ip">Multiple Accounts Targeted From One IP (Password Spray - Triggers Rule 6)</option>
                <option value="normal_activity">Baseline Routine Activity (Normal User Traffic)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Target Account</label>
                <input
                  type="text"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  placeholder="e.g. administrator"
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">Source IP Address</label>
                <input
                  type="text"
                  value={sourceIp}
                  onChange={(e) => setSourceIp(e.target.value)}
                  placeholder="e.g. 192.168.1.185"
                  className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">Event Batch Size</label>
              <input
                type="number"
                min="1"
                max="25"
                value={eventCount}
                onChange={(e) => setEventCount(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-hidden"
              />
              <span className="text-[10.5px] text-[var(--text-muted)]">
                Higher counts exceed detection thresholds and immediately trigger alerts.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={generating}
                className="w-full py-2 rounded text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Generate & Ingest Scenario Events
              </button>
            </div>
          </form>
        </div>

        {/* File Import Hub (JSON & CSV) */}
        <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Import Telemetry Files</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Ingest security event batches from external systems via JSON or CSV format.
                </p>
              </div>
            </div>

            <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] space-y-1.5 text-xs text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-primary)]">Supported File Formats:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li><strong>JSON:</strong> Array of objects with <code>id, timestamp, hostname, username, event_id, description</code>.</li>
                <li><strong>CSV:</strong> Headers for <code>Event ID, Timestamp, Category, Severity, Username, Source IP</code>.</li>
                <li>Data is validated, deduplicated, and fed directly through the detection engine.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json,.csv"
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-blue)] rounded-lg p-6 text-center cursor-pointer transition bg-[var(--bg-elevated)]"
            >
              <Upload className="w-6 h-6 mx-auto text-[var(--text-muted)] mb-2" />
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                {importing ? 'Processing & validating event batch...' : 'Click to select JSON or CSV event log'}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Maximum file size: 10MB
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collector Setup Guide Modal */}
      {collectorModalOpen && (
        <Modal
          isOpen={collectorModalOpen}
          onClose={() => setCollectorModalOpen(false)}
          title="Real Windows Security Log Ingestion Agent"
          subtitle="Instructions for harvesting live Windows Event Logs into the SIEM"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 leading-relaxed">
              <strong>Architecture Note:</strong> Web browsers cannot directly access Windows operating system event logs due to sandbox security boundaries. To collect real Windows Security logs, run the provided collector script on the monitored machine with Administrator privileges.
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-[var(--text-primary)]">Option A: Native PowerShell Collector (Recommended)</h4>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Uses <code>Get-WinEvent -LogName 'Security'</code> to harvest recent logon, process, and lockout events.
              </p>
              <div className="relative">
                <pre className="p-2.5 rounded bg-[var(--table-stripe)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-primary)] overflow-x-auto pr-16">
                  {psCommand}
                </pre>
                <button
                  onClick={() => handleCopy(psCommand, 'ps')}
                  className="absolute right-2 top-2 px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--table-hover)] text-[10.5px] font-medium"
                >
                  {copiedCmd === 'ps' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <h4 className="font-semibold text-[var(--text-primary)]">Option B: Standalone Python Agent</h4>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Runs via Python 3 with built-in subprocess and HTTP forwarding.
              </p>
              <div className="relative">
                <pre className="p-2.5 rounded bg-[var(--table-stripe)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-primary)] overflow-x-auto pr-16">
                  {pyCommand}
                </pre>
                <button
                  onClick={() => handleCopy(pyCommand, 'py')}
                  className="absolute right-2 top-2 px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--table-hover)] text-[10.5px] font-medium"
                >
                  {copiedCmd === 'py' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-[var(--text-muted)] space-y-1">
              <p>• Once executed, real events will be tagged with <strong>Real Event</strong> badges throughout the SIEM.</p>
              <p>• The Log Source status will automatically transition from <code>Not Connected</code> to <code>Live</code>.</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
