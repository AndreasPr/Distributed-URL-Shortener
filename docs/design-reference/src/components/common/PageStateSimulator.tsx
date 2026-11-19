import React from 'react';
import { RefreshCw, Check, AlertCircle, Database, Sparkles } from 'lucide-react';
import { Badge } from '../../design-system/Badge';

export type PageDisplayState = 'normal' | 'loading' | 'empty' | 'error';

interface PageStateSimulatorProps {
  currentState: PageDisplayState;
  onStateChange: (state: PageDisplayState) => void;
  pageLabel?: string;
  onResetData?: () => void;
}

export const PageStateSimulator: React.FC<PageStateSimulatorProps> = ({
  currentState,
  onStateChange,
  pageLabel,
  onResetData,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0c0d15]/80 backdrop-blur-xs text-xs mb-6">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          <Database className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Page View Mode:</span>
        </span>
        {pageLabel && (
          <span className="hidden sm:inline-block text-[11px] text-slate-400 font-mono">
            ({pageLabel})
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-md">
        <button
          type="button"
          onClick={() => onStateChange('normal')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            currentState === 'normal'
              ? 'bg-white dark:bg-[#0f111a] text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Populated
        </button>

        <button
          type="button"
          onClick={() => onStateChange('loading')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            currentState === 'loading'
              ? 'bg-white dark:bg-[#0f111a] text-amber-600 dark:text-amber-400 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Loading Skeleton
        </button>

        <button
          type="button"
          onClick={() => onStateChange('empty')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            currentState === 'empty'
              ? 'bg-white dark:bg-[#0f111a] text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Empty State
        </button>

        <button
          type="button"
          onClick={() => onStateChange('error')}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            currentState === 'error'
              ? 'bg-white dark:bg-[#0f111a] text-rose-600 dark:text-rose-400 font-semibold shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Error State
        </button>
      </div>

      {onResetData && (
        <button
          type="button"
          onClick={onResetData}
          className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
          title="Reset to default mock dataset"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden md:inline">Reset Mock Data</span>
        </button>
      )}
    </div>
  );
};

export const PageErrorAlert: React.FC<{
  title?: string;
  message?: string;
  onRetry: () => void;
}> = ({
  title = 'Failed to load live telemetry',
  message = 'An unexpected HTTP 503 Service Unavailable occurred while reaching edge cache replicas in Ashburn (IAD-01).',
  onRetry,
}) => {
  return (
    <div className="p-6 rounded-xl border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1 flex-1">
          <p className="font-semibold text-sm text-rose-950 dark:text-rose-100">
            {title}
          </p>
          <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
            {message}
          </p>
          <div className="pt-2">
            <button
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Request</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
