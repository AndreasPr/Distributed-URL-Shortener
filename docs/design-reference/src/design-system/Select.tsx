import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      helperText,
      error,
      options,
      size = 'md',
      id,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    const sizeClasses = {
      sm: 'h-8 text-xs pl-2.5 pr-8',
      md: 'h-9 text-xs pl-3 pr-8',
      lg: 'h-10 text-sm pl-3.5 pr-9',
    }[size];

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            className={`w-full appearance-none rounded-lg border bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100 transition-colors outline-none cursor-pointer disabled:cursor-not-allowed ${
              error
                ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                : 'border-slate-300 dark:border-white/10 focus:border-blue-600 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-600 dark:focus:ring-blue-500'
            } ${disabled ? 'opacity-50 bg-slate-50 dark:bg-slate-900/50' : ''} ${sizeClasses} ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-100"
              >
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute right-2.5 pointer-events-none" />
        </div>

        {error ? (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
