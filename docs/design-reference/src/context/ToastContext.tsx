import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'default' | 'success' | 'error' | 'info' | 'destructive';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastItem, 'id'>) => void;
  addToast: (options: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 3500 }: Omit<ToastItem, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = { id, title, description, variant, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, addToast: toast, dismiss }}>
      {children}
      {/* Toast Render Container with accessibility */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-4"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-lg text-sm transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
              item.variant === 'success'
                ? 'bg-white dark:bg-[#0f111a] border-emerald-500/30 text-slate-900 dark:text-slate-100'
                : item.variant === 'error' || item.variant === 'destructive'
                ? 'bg-white dark:bg-[#0f111a] border-rose-500/30 text-slate-900 dark:text-slate-100'
                : item.variant === 'info'
                ? 'bg-white dark:bg-[#0f111a] border-blue-500/30 text-slate-900 dark:text-slate-100'
                : 'bg-white dark:bg-[#0f111a] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {item.variant === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
              {(item.variant === 'error' || item.variant === 'destructive') && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
              {item.variant === 'info' && <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
              {item.variant === 'default' && <Info className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs tracking-tight text-slate-900 dark:text-slate-100">
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>

            <button
              onClick={() => dismiss(item.id)}
              aria-label="Close notification"
              className="shrink-0 p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
