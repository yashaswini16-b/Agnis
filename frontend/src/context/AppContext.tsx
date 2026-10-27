import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppPage = 'overview' | 'events' | 'alerts' | 'rules' | 'investigations' | 'sources' | 'reports' | 'settings';
export type TimeRange = '15m' | '1h' | '24h' | '7d' | 'all';

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  sidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  activeAlertId: string | null;
  navigateToInvestigation: (alertId: string) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state: defaults to dark mode (genuine gray theme)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('siem_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  // Collapsible sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('siem_sidebar_collapsed') === 'true';
  });

  const [currentPage, setCurrentPage] = useState<AppPage>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    localStorage.setItem('siem_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('siem_sidebar_collapsed', String(next));
      return next;
    });
  };

  const navigateToInvestigation = (alertId: string) => {
    setActiveAlertId(alertId);
    setCurrentPage('investigations');
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        sidebarCollapsed,
        toggleSidebarCollapse,
        currentPage,
        setCurrentPage,
        timeRange,
        setTimeRange,
        globalSearch,
        setGlobalSearch,
        activeAlertId,
        navigateToInvestigation,
        refreshTrigger,
        triggerRefresh,
        toast,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
