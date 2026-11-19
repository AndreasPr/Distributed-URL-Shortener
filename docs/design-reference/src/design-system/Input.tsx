import React from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  error?: string;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  isMonospace?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leftAddon,
      rightAddon,
      isMonospace = false,
      size = 'md',
      id,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    const sizeClasses = {
      sm: 'h-8 text-xs px-2.5',
      md: 'h-9 text-xs px-3',
      lg: 'h-10 text-sm px-3.5',
    }[size];

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight"
          >
            {label}
          </label>
        )}

        <div
          className={`flex items-center rounded-lg border transition-colors bg-white dark:bg-[#0f111a] ${
            error
              ? 'border-rose-500 focus-within:ring-1 focus-within:ring-rose-500'
              : 'border-slate-300 dark:border-white/10 focus-within:border-blue-600 dark:focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-600 dark:focus-within:ring-blue-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50' : ''}`}
        >
          {leftAddon && (
            <div className="pl-3 pr-1 text-slate-500 dark:text-slate-400 text-xs shrink-0 select-none flex items-center">
              {leftAddon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={`w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none disabled:cursor-not-allowed ${
              isMonospace ? 'font-mono tracking-tight text-[11px]' : ''
            } ${sizeClasses} ${className}`}
            {...props}
          />

          {rightAddon && (
            <div className="pr-3 pl-1 text-slate-500 dark:text-slate-400 text-xs shrink-0 select-none flex items-center">
              {rightAddon}
            </div>
          )}
        </div>

        {error ? (
          <p id={`${inputId}-error`} className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-[11px] text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
