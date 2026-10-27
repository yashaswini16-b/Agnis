import React from 'react';
import { SeverityLevel, AlertStatus, EventOrigin } from '../../types';
import { ShieldCheck, TestTube, AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

export const SeverityBadge: React.FC<{ severity: SeverityLevel; className?: string }> = ({ severity, className = '' }) => {
  const styles: Record<SeverityLevel, { bgLight: string; bgDark: string; border: string; text: string }> = {
    Critical: {
      bgLight: 'bg-red-50 text-red-700 border-red-200',
      bgDark: 'dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60',
      border: 'border',
      text: ''
    },
    High: {
      bgLight: 'bg-orange-50 text-orange-700 border-orange-200',
      bgDark: 'dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/60',
      border: 'border',
      text: ''
    },
    Medium: {
      bgLight: 'bg-amber-50 text-amber-700 border-amber-200',
      bgDark: 'dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60',
      border: 'border',
      text: ''
    },
    Low: {
      bgLight: 'bg-blue-50 text-blue-700 border-blue-200',
      bgDark: 'dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60',
      border: 'border',
      text: ''
    },
    Informational: {
      bgLight: 'bg-gray-100 text-gray-700 border-gray-200',
      bgDark: 'dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
      border: 'border',
      text: ''
    }
  };

  const style = styles[severity] || styles.Informational;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-wide ${style.border} ${style.bgLight} ${style.bgDark} ${className}`}
    >
      {severity}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: AlertStatus; className?: string }> = ({ status, className = '' }) => {
  const getBadge = () => {
    switch (status) {
      case 'New':
        return {
          icon: <AlertCircle className="w-3 h-3 mr-1" />,
          cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
        };
      case 'In Progress':
        return {
          icon: <Clock className="w-3 h-3 mr-1" />,
          cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
        };
      case 'Resolved':
        return {
          icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
        };
      case 'Dismissed':
        return {
          icon: <XCircle className="w-3 h-3 mr-1" />,
          cls: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
        };
      default:
        return {
          icon: null,
          cls: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300'
        };
    }
  };

  const { icon, cls } = getBadge();

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls} ${className}`}>
      {icon}
      {status}
    </span>
  );
};

export const OriginBadge: React.FC<{ origin: EventOrigin; className?: string }> = ({ origin, className = '' }) => {
  if (origin === 'Real') {
    return (
      <span
        title="Verified real telemetry harvested from monitored host"
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 ${className}`}
      >
        <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
        Real Event
      </span>
    );
  }

  return (
    <span
      title="Synthetically generated telemetry for demonstration and testing"
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 ${className}`}
    >
      <TestTube className="w-3 h-3 mr-1 text-purple-600 dark:text-purple-400" />
      Simulated
    </span>
  );
};
