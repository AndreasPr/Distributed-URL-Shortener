import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'default' | 'success' | 'error' | 'info';

export interface ToastProps {
  title: string;
  description?: string;
  variant?: ToastVariant;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  title,
  description,
  variant = 'default',
  onClose,
  className = '',
}) => {
  return (
    <div
      role="status"
      className={`flex items-start gap-3 p-3.5 rounded-lg border shadow-sm text-sm ${
        variant === 'success'
          ? 'bg-white dark:bg-[#0f111a] border-emerald-500/30 text-slate-900 dark:text-slate-100'
          : variant === 'error'
          ? 'bg-white dark:bg-[#0f111a] border-rose-500/30 text-slate-900 dark:text-slate-100'
          : variant === 'info'
          ? 'bg-white dark:bg-[#0f111a] border-blue-500/30 text-slate-900 dark:text-slate-100'
          : 'bg-white dark:bg-[#0f111a] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100'
      } ${className}`}
    >
      <div className="shrink-0 mt-0.5">
        {variant === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        {variant === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
        {variant === 'info' && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
        {variant === 'default' && <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xs tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </p>
        {description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close notification"
          className="shrink-0 p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
