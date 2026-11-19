import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './Card';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number | string;
    trend: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  subtitle,
  className = '',
}) => {
  return (
    <Card className={`p-5 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
        <span className="text-xs font-medium tracking-tight truncate">{title}</span>
        {icon && <div className="text-slate-500 dark:text-slate-400 shrink-0">{icon}</div>}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 tracking-tight">
          {value}
        </div>

        {(change || subtitle) && (
          <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
            {change && (
              <span
                className={`inline-flex items-center gap-1 font-semibold tabular-nums text-[11px] ${
                  change.trend === 'up'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : change.trend === 'down'
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {change.trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
                {change.trend === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
                {change.trend === 'neutral' && <Minus className="w-3.5 h-3.5" />}
                {change.value}
              </span>
            )}
            <span className="text-slate-600 dark:text-slate-400 text-[11px]">
              {change?.label || subtitle}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
