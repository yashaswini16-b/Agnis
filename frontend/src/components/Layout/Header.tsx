import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { TimeRange, AppPage } from '../../context/AppContext';
import {
  Search,
  Moon,
  Sun,
  Clock,
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    theme,
    toggleTheme,
    sidebarCollapsed,
    toggleSidebarCollapse,
    timeRange,
    setTimeRange,
    globalSearch,
    setGlobalSearch,
    triggerRefresh
  } = useApp();

  const [profileOpen, setProfileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getPageTitle = (page: AppPage): { title: string; category: string } => {
    switch (page) {
      case 'overview':
        return { title: 'Security Operations Overview', category: 'Monitoring' };
      case 'events':
        return { title: 'Security Event Explorer', category: 'Telemetry' };
      case 'alerts':
        return { title: 'Alerts Management & Triage', category: 'Detection' };
      case 'rules':
        return { title: 'Detection Rule Engine', category: 'Configuration' };
      case 'investigations':
        return { title: 'Analyst Investigation Workspace', category: 'Response' };
      case 'sources':
        return { title: 'Log Sources & Ingestion Hub', category: 'Data Pipeline' };
      case 'reports':
        return { title: 'Executive & Incident Reports', category: 'Compliance' };
      case 'settings':
        return { title: 'System & Platform Settings', category: 'Administration' };
      default:
        return { title: 'Security Operations', category: 'SOC' };
    }
  };

  const { title, category } = getPageTitle(currentPage);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    triggerRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <header className="h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 flex items-center justify-between shrink-0 select-none z-20">
      {/* Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebarCollapse}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
        >
          {sidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
            <span>SOC</span>
            <span>/</span>
            <span>{category}</span>
          </div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{title}</h1>
        </div>
      </div>

      {/* Global Controls */}
      <div className="flex items-center gap-3">
        {/* Global Search Input */}
        <div className="relative w-64 md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search IPs, hosts, users, event IDs..."
            className="w-full pl-9 pr-3 py-1.5 rounded text-xs bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--accent-blue)] transition"
          />
        </div>

        {/* Time-Range Selector */}
        <div className="flex items-center border border-[var(--border-subtle)] rounded bg-[var(--bg-elevated)] p-0.5 text-xs">
          <Clock className="w-3.5 h-3.5 ml-2 mr-1 text-[var(--text-secondary)]" />
          {(['15m', '1h', '24h', '7d', 'all'] as TimeRange[]).map((tr) => (
            <button
              key={tr}
              onClick={() => setTimeRange(tr)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                timeRange === tr
                  ? 'bg-[var(--accent-blue)] text-white shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tr.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Ingestion Status Indicator */}
        <button
          onClick={() => setCurrentPage('sources')}
          title="Data Ingestion Status — Click to view sources"
          className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] text-xs text-[var(--text-secondary)] transition cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-[11px] font-medium text-[var(--text-primary)]">Ingestion Online</span>
        </button>

        {/* Refresh Button */}
        <button
          onClick={handleManualRefresh}
          title="Refresh Data"
          className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--table-hover)] transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="p-1.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--table-hover)] transition"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
        </button>

        {/* Analyst Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--table-hover)] transition text-xs"
          >
            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
              Y
            </div>
            <span className="text-[11.5px] font-medium text-[var(--text-primary)] hidden md:inline">
              Analyst Yashaswini
            </span>
            <ChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-lg py-2 z-50 text-xs"
              onClick={() => setProfileOpen(false)}
            >
              <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                <p className="font-semibold text-[var(--text-primary)]">Yashaswini K.</p>
                <p className="text-[11px] text-[var(--text-secondary)]">SOC Tier-2 Lead Analyst</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Active Session
                </div>
              </div>
              <button
                onClick={() => setCurrentPage('settings')}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              >
                Analyst Preferences
              </button>
              <button
                onClick={() => setCurrentPage('reports')}
                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]"
              >
                My Incident Reports
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
