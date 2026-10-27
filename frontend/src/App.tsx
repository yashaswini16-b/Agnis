import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';

import { OverviewPage } from './pages/OverviewPage';
import { EventExplorerPage } from './pages/EventExplorerPage';
import { AlertsPage } from './pages/AlertsPage';
import { DetectionRulesPage } from './pages/DetectionRulesPage';
import { InvestigationWorkspacePage } from './pages/InvestigationWorkspacePage';
import { LogSourcesPage } from './pages/LogSourcesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { currentPage, toast } = useApp();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage />;
      case 'events':
        return <EventExplorerPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'rules':
        return <DetectionRulesPage />;
      case 'investigations':
        return <InvestigationWorkspacePage />;
      case 'sources':
        return <LogSourcesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 flex overflow-hidden relative">
          {renderCurrentPage()}
        </main>
      </div>

      {/* Global Toast Alert */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-md shadow-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-150">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-blue-500 shrink-0" />}
          <span className="text-[var(--text-primary)]">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
