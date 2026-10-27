import React from 'react';
import { useApp } from '../../context/AppContext';
import type { AppPage } from '../../context/AppContext';
import {
  LayoutDashboard,
  Search,
  Bell,
  ShieldAlert,
  FolderSearch,
  Server,
  FileBarChart,
  Settings,
  Shield,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface NavItem {
  id: AppPage;
  label: string;
  icon: React.ReactNode;
}

export const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebarCollapse } = useApp();

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
    { id: 'events', label: 'Event Explorer', icon: <Search className="w-4 h-4 shrink-0" /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4 shrink-0" /> },
    { id: 'rules', label: 'Detection Rules', icon: <ShieldAlert className="w-4 h-4 shrink-0" /> },
    { id: 'investigations', label: 'Investigations', icon: <FolderSearch className="w-4 h-4 shrink-0" /> },
    { id: 'sources', label: 'Log Sources', icon: <Server className="w-4 h-4 shrink-0" /> },
    { id: 'reports', label: 'Reports', icon: <FileBarChart className="w-4 h-4 shrink-0" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4 shrink-0" /> }
  ];

  return (
    <aside
      className={`border-r border-[var(--border-subtle)] bg-[var(--bg-sidebar)] flex flex-col shrink-0 h-screen select-none transition-all duration-200 ease-in-out ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand & Platform Header */}
      <div className={`h-14 flex items-center border-b border-[var(--border-subtle)] ${
        sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      }`}>
        {sidebarCollapsed ? (
          <button
            onClick={toggleSidebarCollapse}
            title="Expand Sidebar"
            className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
          >
            <Shield className="w-4 h-4" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                  AegisSOC <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded shrink-0">SIEM</span>
                </div>
                <p className="text-[10.5px] text-[var(--text-secondary)] font-medium truncate">Cybersecurity Operations</p>
              </div>
            </div>
            <button
              onClick={toggleSidebarCollapse}
              title="Collapse Sidebar"
              className="p-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation List */}
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${sidebarCollapsed ? 'px-2' : 'px-3'}`}>
        {!sidebarCollapsed && (
          <div className="px-2 pb-2 text-[10.5px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            SOC Navigation
          </div>
        )}
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center rounded text-xs font-medium transition-colors cursor-pointer ${
                sidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2 text-left'
              } ${
                isActive
                  ? 'bg-[var(--accent-blue)] text-white shadow-xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <span className={isActive ? 'text-white' : 'text-[var(--text-secondary)]'}>
                {item.icon}
              </span>
              {!sidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Status Footer */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleSidebarCollapse}
              title="Expand Sidebar"
              className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
              title="Engine Active v1.2-edu"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Engine Active
              </span>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">v1.2-edu</span>
            </div>
            <div className="mt-1 text-[10.5px] text-[var(--text-muted)] truncate">
              Target: SEC-DC01.CORP.LOCAL
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
