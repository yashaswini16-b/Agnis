import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SecurityAlert, AlertStatus } from '../types';
import { SeverityBadge, StatusBadge } from '../components/UI/Badges';
import {
  Bell,
  Search,
  Filter,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FolderOpen,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  UserCheck
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { globalSearch, timeRange, navigateToInvestigation, refreshTrigger, showToast } = useApp();

  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      });

      const effectiveSearch = searchTerm || globalSearch;
      if (effectiveSearch) params.append('search', effectiveSearch);
      if (severityFilter !== 'All') params.append('severity', severityFilter);
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (timeRange) params.append('time_range', timeRange);

      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load alerts');
      const data = await res.json();
      setAlerts(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      showToast(err.message || 'Error fetching alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [page, pageSize, severityFilter, statusFilter, sortBy, sortOrder, timeRange, refreshTrigger]);

  const handleStatusChange = async (alertId: string, newStatus: AlertStatus) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update alert status');
      showToast(`Alert ${alertId} updated to ${newStatus}`, 'success');
      fetchAlerts();
    } catch (err: any) {
      showToast(err.message || 'Status update failed', 'error');
    }
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Status counters
  const statusCounts = {
    new: alerts.filter(a => a.status === 'New').length,
    inProgress: alerts.filter(a => a.status === 'In Progress').length,
    resolved: alerts.filter(a => a.status === 'Resolved').length
  };

  return (
    <div className="flex-1 p-6 space-y-4 overflow-y-auto">
      {/* Triage Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Total Active Alerts</div>
            <div className="text-xl font-bold text-[var(--text-primary)]">{total}</div>
          </div>
          <Bell className="w-5 h-5 text-blue-500" />
        </div>
        <div className="p-3.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Unreviewed (New)</div>
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{statusCounts.new}</div>
          </div>
          <AlertTriangle className="w-5 h-5 text-blue-500" />
        </div>
        <div className="p-3.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Under Investigation</div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{statusCounts.inProgress}</div>
          </div>
          <Clock className="w-5 h-5 text-amber-500" />
        </div>
        <div className="p-3.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] flex items-center justify-between">
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Resolved Incidents</div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{statusCounts.resolved}</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-3">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Alert ID, title, IP address, target account..."
              className="w-full pl-9 pr-3 py-1.5 rounded text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-blue)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-hidden"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="New">New</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Dismissed">Dismissed</option>
            </select>

            <button
              onClick={fetchAlerts}
              className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-secondary)] transition"
              title="Refresh Alerts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Alerts Table */}
      <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--table-header)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)] uppercase text-[10px] tracking-wider font-semibold select-none">
              <tr>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Alert ID</th>
                <th className="py-2.5 px-3">Alert Title & Observed Pattern</th>
                <th className="py-2.5 px-3">Detection Rule</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('timestamp')}>
                  <div className="flex items-center gap-1">
                    Triggered <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Evidence</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[var(--text-secondary)]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[var(--accent-blue)] mb-2" />
                    Loading detection alerts...
                  </td>
                </tr>
              ) : alerts.length > 0 ? (
                alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-[var(--table-hover)] transition cursor-pointer"
                    onClick={() => navigateToInvestigation(alert.id)}
                  >
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-[var(--accent-blue)] whitespace-nowrap">
                      {alert.id}
                    </td>
                    <td className="py-2.5 px-3 max-w-sm">
                      <div className="font-semibold text-[var(--text-primary)] truncate">{alert.title}</div>
                      <div className="text-[11px] text-[var(--text-secondary)] truncate">{alert.summary}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                      {alert.rule_name}
                    </td>
                    <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                      {alert.target_account ? (
                        <div>User: <strong className="text-[var(--text-primary)]">{alert.target_account}</strong></div>
                      ) : null}
                      {alert.source_ip ? (
                        <div className="text-[11px] text-[var(--text-muted)] font-mono">IP: {alert.source_ip}</div>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-mono text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(alert.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                        {alert.evidence_count || 1} events
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={alert.status}
                        onChange={(e) => handleStatusChange(alert.id, e.target.value as AlertStatus)}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-hidden"
                      >
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Dismissed">Dismissed</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigateToInvestigation(alert.id)}
                        className="px-2.5 py-1 rounded text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] transition inline-flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        Investigate <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[var(--text-muted)]">
                    No alerts found matching current filters. Check the Detection Rules page or generate scenario events from Log Sources.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total alerts)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-[var(--border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--table-hover)] text-[var(--text-primary)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-[11px]">{page}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-[var(--border-subtle)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--table-hover)] text-[var(--text-primary)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
