import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ReportSummary, SeverityLevel } from '../types';
import { SeverityBadge } from '../components/UI/Badges';
import {
  FileBarChart,
  Download,
  Printer,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Building,
  UserCheck
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { refreshTrigger, showToast } = useApp();

  const [timeRange, setTimeRange] = useState('7d');
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/summary?time_range=${timeRange}`);
      if (!res.ok) throw new Error('Failed to load report summary');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      showToast(err.message || 'Error generating report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeRange, refreshTrigger]);

  const handleExportCSV = () => {
    window.open(`/api/reports/export/csv?time_range=${timeRange}`, '_blank');
    showToast('Exporting incident report to CSV...', 'info');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto print:p-0 print:bg-white print:text-black">
      {/* Top Header & Actions (Hidden on Print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] print:hidden">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-blue-500" />
            Security Incident & Operational Reports
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Executive summaries, rule hit analysis, and documented investigation resolutions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Filter */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-2.5 py-1.5 rounded text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-hidden"
          >
            <option value="24h">Past 24 Hours</option>
            <option value="7d">Past 7 Days</option>
            <option value="30d">Past 30 Days</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={fetchReport}
            className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-secondary)] transition"
            title="Refresh Report"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Main Formal Report Card */}
      <div className="p-8 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-6 shadow-xs print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                A
              </span>
              <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">
                AegisSOC — Cybersecurity Operations Center
              </span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mt-2">
              Security Monitoring & Threat Detection Summary
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Reporting Window: <strong>{timeRange.toUpperCase()}</strong> | Generated on {new Date().toLocaleDateString()} by Analyst Yashaswini
            </p>
          </div>
          <div className="text-right text-xs text-[var(--text-secondary)] font-mono">
            <div>STATUS: VERIFIED</div>
            <div>CONFIDENTIALITY: INTERNAL</div>
          </div>
        </div>

        {/* Mandatory College Project Disclaimer */}
        <div className="p-3 rounded border border-gray-200 bg-gray-50 dark:bg-gray-800/40 dark:border-gray-700 text-xs text-[var(--text-secondary)] leading-relaxed">
          <strong>Academic & Demonstration Notice:</strong> This report compiles metrics from local log collectors and simulated test scenarios. Simulated activity is strictly segregated and should not be characterized as an unverified real-world compromise.
        </div>

        {/* High-Level Operational Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Total Events Evaluated</span>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {data?.total_events.toLocaleString() || 0}
            </div>
          </div>
          <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Alerts Generated</span>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {data?.total_alerts || 0}
            </div>
          </div>
          <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Incidents Resolved</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {data?.alerts_by_status?.Resolved || 0}
            </div>
          </div>
          <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Triage Resolution Rate</span>
            <div className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {data && data.total_alerts > 0
                ? Math.round(((data.alerts_by_status?.Resolved || 0) / data.total_alerts) * 100)
                : 100}%
            </div>
          </div>
        </div>

        {/* Two-Column Breakdown: Severities & Statuses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Alerts by Severity */}
          <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] space-y-2">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Alerts by Severity Level
            </h3>
            <div className="space-y-1.5 text-xs">
              {['Critical', 'High', 'Medium', 'Low'].map((sev) => {
                const count = data?.alerts_by_severity?.[sev] || 0;
                return (
                  <div key={sev} className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                    <SeverityBadge severity={sev as SeverityLevel} />
                    <span className="font-semibold text-[var(--text-primary)]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts by Status */}
          <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] space-y-2">
            <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
              Investigation Triage Status
            </h3>
            <div className="space-y-1.5 text-xs">
              {['New', 'In Progress', 'Resolved', 'Dismissed'].map((status) => {
                const count = data?.alerts_by_status?.[status] || 0;
                return (
                  <div key={status} className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)]">
                    <span className="font-medium text-[var(--text-secondary)]">{status}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detection Rules Breakdown */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Detection Rules Trigger Summary
          </h3>
          <div className="overflow-x-auto rounded border border-[var(--border-subtle)]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--table-header)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)] uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-2 px-3">Rule Name</th>
                  <th className="py-2 px-3">Severity</th>
                  <th className="py-2 px-3 text-right">Trigger Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                {(data?.alerts_by_rule || []).length > 0 ? (
                  data?.alerts_by_rule.map((r, i) => (
                    <tr key={i} className="hover:bg-[var(--table-hover)]">
                      <td className="py-2 px-3 font-medium">{r.rule_name}</td>
                      <td className="py-2 px-3"><SeverityBadge severity={r.severity} /></td>
                      <td className="py-2 px-3 text-right font-semibold">{r.count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-[var(--text-muted)]">No rule detections in this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resolved Investigation Findings Log */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider">
            Documented Analyst Resolutions & Incident Findings
          </h3>
          <div className="space-y-2">
            {(data?.resolved_findings || []).length > 0 ? (
              data?.resolved_findings.map((f) => (
                <div key={f.id} className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[var(--text-primary)] font-mono">{f.id}: {f.title}</span>
                    <span className="text-[var(--text-muted)]">{new Date(f.resolved_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-[var(--text-secondary)] italic">"{f.resolution}"</p>
                </div>
              ))
            ) : (
              <div className="p-4 rounded border border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                No closed incident findings recorded yet. Use the Investigation Workspace to document resolution summaries.
              </div>
            )}
          </div>
        </div>

        {/* Signature & Sign-off Block */}
        <div className="pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div>
            <div>Reviewed by: <strong>Yashaswini K.</strong></div>
            <div>Lead Security Analyst & SIEM Administrator</div>
          </div>
          <div className="text-right">
            <div>Mini SIEM AegisSOC Platform v1.2</div>
            <div>Automated SOC Report Engine</div>
          </div>
        </div>
      </div>
    </div>
  );
};
