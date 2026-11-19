import React from 'react';
import { EmptyLinksIllustration } from './Icons';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-lg border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] ${className}`}
    >
      <div className="mb-4">
        {icon || <EmptyLinksIllustration className="w-28 h-20 text-slate-400 dark:text-slate-600" />}
      </div>

      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
