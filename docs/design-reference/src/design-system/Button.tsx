import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Size tokens
    const sizeClasses = {
      sm: 'h-8 px-3 text-xs gap-1.5 rounded-md',
      md: 'h-9 px-4 text-xs font-medium gap-2 rounded-lg',
      lg: 'h-10 px-5 text-sm font-medium gap-2.5 rounded-lg',
      icon: 'h-9 w-9 p-0 flex items-center justify-center rounded-lg',
    }[size];

    // Variant tokens guaranteed WCAG AA in both light & dark mode
    const variantClasses = {
      primary:
        'bg-blue-600 hover:bg-blue-700 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500 active:bg-blue-800 disabled:bg-blue-600/50',
      secondary:
        'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-100 dark:border-white/10 active:bg-slate-300 dark:active:bg-white/20',
      outline:
        'bg-transparent hover:bg-slate-100 text-slate-800 border border-slate-300 dark:text-slate-200 dark:border-white/15 dark:hover:bg-white/5 active:bg-slate-200 dark:active:bg-white/10',
      ghost:
        'bg-transparent hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white active:bg-slate-200 dark:active:bg-white/10',
      destructive:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-rose-500 active:bg-rose-800 disabled:bg-rose-600/50',
      link:
        'bg-transparent text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline-offset-4 hover:underline p-0 h-auto font-normal',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors select-none focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
