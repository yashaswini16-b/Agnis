import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SecurityEvent } from '../types';
import { SeverityBadge, OriginBadge } from '../components/UI/Badges';
import { Modal } from '../components/UI/Modal';
import {
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileCode,
  Copy,
  Check,
  ShieldCheck,
  TestTube
} from 'lucide-react';

export const EventExplorerPage: React.FC = () => {
  const { globalSearch, timeRange, refreshTrigger, showToast } = useApp();

  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [originFilter, setOriginFilter] = useState('All');
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selected event modal
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const fetchEvents = async () => {
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
      if (categoryFilter !== 'All') params.append('event_category', categoryFilter);
      if (originFilter !== 'All') params.append('origin', originFilter);
      if (timeRange) params.append('time_range', timeRange);

      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load events');
      const data = await res.json();
      setEvents(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      showToast(err.message || 'Error fetching events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, pageSize, severityFilter, categoryFilter, originFilter, sortBy, sortOrder, timeRange, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    const effectiveSearch = searchTerm || globalSearch;
    if (effectiveSearch) params.append('search', effectiveSearch);
    if (severityFilter !== 'All') params.append('severity', severityFilter);
    if (originFilter !== 'All') params.append('origin', originFilter);
    if (timeRange) params.append('time_range', timeRange);

    window.open(`/api/events/export/csv?${params.toString()}`, '_blank');
    showToast('Exporting security events to CSV...', 'info');
  };

  const handleCopyRaw = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
    showToast('Raw event JSON copied to clipboard', 'success');
  };

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setPage(1);
  };

  return (
    <div className="flex-1 p-6 space-y-4 overflow-y-auto">
      {/* Controls & Search Header */}
      <div className="p-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by keyword, user, host, IP, Windows Event ID (e.g. 4625)..."
              className="w-full pl-9 pr-3 py-1.5 rounded text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-blue)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Severity Filter */}
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
              <option value="Informational">Informational</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              <option value="Authentication">Authentication</option>
              <option value="Process Creation">Process Creation</option>
              <option value="Privilege Escalation">Privilege Escalation</option>
              <option value="Account Management">Account Management</option>
              <option value="Security Audit">Security Audit</option>
            </select>

            {/* Origin Filter (Real vs Simulated) */}
            <select
              value={originFilter}
              onChange={(e) => { setOriginFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 rounded text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] focus:outline-hidden"
            >
              <option value="All">All Origins (Real & Demo)</option>
              <option value="Real">Real Events Only</option>
              <option value="Simulated">Simulated Only</option>
            </select>

            {/* Search Button */}
            <button
              type="submit"
              className="px-3 py-1.5 rounded text-xs font-medium bg-[var(--accent-blue)] text-white hover:bg-[var(--accent-blue-hover)] transition cursor-pointer"
            >
              Filter
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded text-xs font-medium border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </form>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span>Showing {events.length} of {total.toLocaleString()} security events</span>
            {originFilter === 'Real' && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3 h-3" /> Filtered to verified real host telemetry
              </span>
            )}
            {originFilter === 'Simulated' && (
              <span className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                <TestTube className="w-3 h-3" /> Filtered to simulated demo scenarios
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>Page {page} of {totalPages}</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-1.5 py-0.5 rounded text-[11px] bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)]"
            >
              <option value="15">15 / page</option>
              <option value="25">25 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Events Table */}
      <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--table-header)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)] uppercase text-[10px] tracking-wider font-semibold select-none">
              <tr>
                <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('timestamp')}>
                  <div className="flex items-center gap-1">
                    Timestamp <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Origin</th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('severity')}>
                  <div className="flex items-center gap-1">
                    Severity <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Win Event ID</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-[var(--text-primary)]" onClick={() => toggleSort('hostname')}>
                  <div className="flex items-center gap-1">
                    Host <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3">User / Account</th>
                <th className="py-2.5 px-3">Source IP</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[var(--text-secondary)]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[var(--accent-blue)] mb-2" />
                    Querying security event index...
                  </td>
                </tr>
              ) : events.length > 0 ? (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-[var(--table-hover)] transition cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <td className="py-2.5 px-3 text-[11px] font-mono text-[var(--text-muted)] whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <OriginBadge origin={event.origin} />
                    </td>
                    <td className="py-2.5 px-3">
                      <SeverityBadge severity={event.severity} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[var(--accent-blue)]">
                      {event.event_id || '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-[var(--text-secondary)]">
                      {event.event_category}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-primary)] whitespace-nowrap">
                      {event.hostname}
                    </td>
                    <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                      {event.username ? (
                        <span className="text-[var(--text-primary)]">{event.username}</span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                      {event.source_ip || '—'}
                    </td>
                    <td className="py-2.5 px-3 max-w-sm truncate text-[var(--text-secondary)]">
                      {event.description}
                    </td>
                    <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedEvent(event)}
                        className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-elevated)] transition"
                        title="Inspect Event"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-xs text-[var(--text-muted)]">
                    No matching security events found. Try expanding your search terms or generate test scenarios from Log Sources.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total records)
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

      {/* Event Details & Raw JSON Inspector Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Event Inspection: ${selectedEvent.id}`}
          subtitle={`Recorded ${new Date(selectedEvent.timestamp).toLocaleString()} on ${selectedEvent.hostname}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Quick Summary Pill Row */}
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <OriginBadge origin={selectedEvent.origin} />
              <SeverityBadge severity={selectedEvent.severity} />
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                Windows Event ID {selectedEvent.event_id || 'Audit'}
              </span>
              <span className="px-2 py-0.5 rounded text-xs bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                {selectedEvent.event_category}
              </span>
            </div>

            {/* Field Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <span className="text-[10.5px] uppercase font-semibold text-[var(--text-muted)] block">Event ID</span>
                <span className="font-mono text-[var(--text-primary)] font-medium">{selectedEvent.id}</span>
              </div>
              <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <span className="text-[10.5px] uppercase font-semibold text-[var(--text-muted)] block">Target Account</span>
                <span className="text-[var(--text-primary)] font-medium">{selectedEvent.username || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <span className="text-[10.5px] uppercase font-semibold text-[var(--text-muted)] block">Source IP</span>
                <span className="font-mono text-[var(--text-primary)] font-medium">{selectedEvent.source_ip || 'N/A'}</span>
              </div>
              <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <span className="text-[10.5px] uppercase font-semibold text-[var(--text-muted)] block">Hostname</span>
                <span className="font-mono text-[var(--text-primary)] font-medium">{selectedEvent.hostname}</span>
              </div>
              <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <span className="text-[10.5px] uppercase font-semibold text-[var(--text-muted)] block">Source Type</span>
                <span className="text-[var(--text-primary)] font-medium">{selectedEvent.source_type}</span>
              </div>
              <div className="p-2.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                <span className="text-[10.5px] uppercase font-semibold text-[var(--text-muted)] block">Correlated Rule</span>
                <span className="font-mono text-[var(--text-primary)] font-medium">{selectedEvent.related_rule_id || 'None'}</span>
              </div>
            </div>

            {/* Description */}
            <div className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
              <span className="text-[10.5px] uppercase font-semibold text-[var(--text-muted)] block mb-1">
                Security Event Description
              </span>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                {selectedEvent.description}
              </p>
            </div>

            {/* Raw JSON Details Viewer */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-[var(--accent-blue)]" /> Raw Normalized Telemetry (JSON)
                </span>
                <button
                  onClick={() => handleCopyRaw(JSON.stringify(selectedEvent.raw_data || {}, null, 2))}
                  className="px-2 py-0.5 rounded text-[11px] border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition flex items-center gap-1"
                >
                  {copiedRaw ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copiedRaw ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <pre className="p-3 rounded bg-[var(--table-stripe)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-primary)] overflow-x-auto max-h-56">
                {JSON.stringify(selectedEvent.raw_data || {}, null, 2)}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
