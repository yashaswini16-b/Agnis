import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { OverviewData } from '../types';
import { SeverityBadge, StatusBadge } from '../components/UI/Badges';
import {
  ShieldAlert,
  AlertTriangle,
  Activity,
  FolderOpen,
  Server,
  Zap,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const OverviewPage: React.FC = () => {
  const { timeRange, navigateToInvestigation, setCurrentPage, refreshTrigger, theme } = useApp();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/overview?time_range=${timeRange}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load overview`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [timeRange, refreshTrigger]);

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#38393D' : '#E5E7EB';
  const textMuted = isDark ? '#B0B3B8' : '#6B7280';
  const tooltipBg = isDark ? '#303134' : '#FFFFFF';
  const tooltipBorder = isDark ? '#45464A' : '#E5E7EB';
  const tooltipText = isDark ? '#F1F3F4' : '#111827';

  // Severity colors
  const SEVERITY_COLORS: Record<string, string> = {
    Critical: '#EF4444',
    High: '#F97316',
    Medium: '#F59E0B',
    Low: '#3B82F6'
  };

  if (loading && !data) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent-blue)]" />
          Loading security operations overview...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6">
        <div className="p-4 rounded border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
          <span>Failed to load overview data: {error}</span>
          <button onClick={fetchOverview} className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    total_events: 0,
    critical_alerts: 0,
    high_alerts: 0,
    open_investigations: 0,
    active_sources: 0,
    triggered_rules: 0
  };

  const severityPieData = Object.entries(data?.severity_distribution || {})
    .filter(([_, count]) => count > 0)
    .map(([sev, count]) => ({
      name: sev,
      value: count,
      color: SEVERITY_COLORS[sev] || '#6B7280'
    }));

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Top Notice Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>
            <strong>SIEM Monitoring Active</strong> — Correlation engine running over time window: <strong>{timeRange.toUpperCase()}</strong>.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            Telemetry: Windows Security Logs & Audit Trails
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Events */}
        <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Total Events</span>
            <Activity className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {summary.total_events.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            Ingested telemetry
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Critical Alerts</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
            {summary.critical_alerts}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            Immediate escalation
          </div>
        </div>

        {/* High Severity */}
        <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>High Severity</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
            {summary.high_alerts}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            Priority investigation
          </div>
        </div>

        {/* Open Investigations */}
        <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Open Triage</span>
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {summary.open_investigations}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            New & in-progress
          </div>
        </div>

        {/* Active Log Sources */}
        <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Log Sources</span>
            <Server className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {summary.active_sources}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            Live & demo nodes
          </div>
        </div>

        {/* Triggered Rules */}
        <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Rules Triggered</span>
            <Zap className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {summary.triggered_rules}
          </div>
          <div className="mt-1 text-[11px] text-[var(--text-muted)]">
            Active detections
          </div>
        </div>
      </div>

      {/* Primary Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Events Over Time Chart */}
        <div className="lg:col-span-2 p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Security Events & Alert Timeline</h2>
              <p className="text-xs text-[var(--text-secondary)]">Volume of incoming events and correlated alert spikes</p>
            </div>
            <button
              onClick={() => setCurrentPage('events')}
              className="text-xs text-[var(--accent-blue)] hover:underline flex items-center gap-1"
            >
              Explore Events <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.events_over_time || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="time" stroke={textMuted} fontSize={11} tickLine={false} />
                <YAxis stroke={textMuted} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    color: tooltipText,
                    fontSize: '11px',
                    borderRadius: '4px'
                  }}
                />
                <Area type="monotone" dataKey="events" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorEvents)" name="Events" />
                <Area type="monotone" dataKey="alerts" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#colorAlerts)" name="Alerts" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution Pie Chart */}
        <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Alerts by Severity</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-2">Breakdown of active detection alerts</p>

          <div className="flex-1 flex items-center justify-center min-h-[160px]">
            {severityPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={severityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {severityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      color: tooltipText,
                      fontSize: '11px',
                      borderRadius: '4px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-[var(--text-muted)] text-center py-8">
                No alerts recorded in selected period
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-[var(--border-subtle)] text-xs">
            {['Critical', 'High', 'Medium', 'Low'].map((sev) => {
              const count = data?.severity_distribution?.[sev] || 0;
              return (
                <div key={sev} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }}></span>
                    <span className="text-[var(--text-secondary)]">{sev}</span>
                  </span>
                  <span className="font-semibold text-[var(--text-primary)]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Middle Row: Event Categories & Top Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Categories Bar Chart */}
        <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Event Categories</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-4">Distribution of telemetry by security taxonomy</p>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.event_categories || []} layout="vertical" margin={{ left: 30, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" stroke={textMuted} fontSize={11} />
                <YAxis dataKey="category" type="category" stroke={textMuted} fontSize={10.5} width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    color: tooltipText,
                    fontSize: '11px',
                    borderRadius: '4px'
                  }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 3, 3, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Frequently Triggered Rules & Top Sources */}
        <div className="p-5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Detection Rule Activity</h2>
              <button
                onClick={() => setCurrentPage('rules')}
                className="text-xs text-[var(--accent-blue)] hover:underline flex items-center gap-1"
              >
                Manage Rules <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-3">Top rules generating security alerts</p>

            <div className="space-y-2">
              {(data?.top_rules || []).slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 overflow-hidden pr-2">
                    <SeverityBadge severity={r.severity} />
                    <span className="font-medium text-[var(--text-primary)] truncate">{r.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-semibold text-xs text-[var(--text-primary)]">{r.count}</span>
                    <span className="text-[10.5px] text-[var(--text-muted)]">alerts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
            <span className="text-[11px] text-[var(--text-secondary)] font-medium">Top Monitored Hosts: </span>
            <span className="text-[11px] text-[var(--text-primary)]">
              {(data?.top_sources || []).map((s) => `${s.hostname} (${s.count})`).join(' • ') || 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Security Alerts Table */}
      <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-elevated)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Security Alerts</h2>
            <p className="text-xs text-[var(--text-secondary)]">Actionable alerts flagged by the detection engine requiring investigation</p>
          </div>
          <button
            onClick={() => setCurrentPage('alerts')}
            className="text-xs text-[var(--accent-blue)] hover:underline flex items-center gap-1 font-medium"
          >
            View All Alerts <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--table-header)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)] uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-4">Severity</th>
                <th className="py-2.5 px-4">Alert ID</th>
                <th className="py-2.5 px-4">Detection Rule</th>
                <th className="py-2.5 px-4">Target / Entity</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
              {(data?.recent_alerts || []).length > 0 ? (
                data?.recent_alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-[var(--table-hover)] transition cursor-pointer"
                    onClick={() => navigateToInvestigation(alert.id)}
                  >
                    <td className="py-2.5 px-4">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-[var(--accent-blue)]">
                      {alert.id}
                    </td>
                    <td className="py-2.5 px-4 font-medium max-w-xs truncate">
                      {alert.title}
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-secondary)]">
                      {alert.target_account ? (
                        <span>User: <strong className="text-[var(--text-primary)]">{alert.target_account}</strong></span>
                      ) : alert.source_ip ? (
                        <span>IP: <strong className="text-[var(--text-primary)]">{alert.source_ip}</strong></span>
                      ) : (
                        alert.hostname || 'Host'
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-[var(--text-muted)] text-[11px] whitespace-nowrap">
                      {new Date(alert.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={alert.status} />
                    </td>
                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigateToInvestigation(alert.id)}
                        className="px-2.5 py-1 rounded text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition inline-flex items-center gap-1"
                      >
                        Investigate <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                    No alerts generated yet. Run a demonstration attack scenario from Log Sources to trigger detections.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
