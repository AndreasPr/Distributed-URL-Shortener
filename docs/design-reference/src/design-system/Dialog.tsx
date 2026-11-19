import React, { useEffect, createContext, useContext } from 'react';
import { X } from 'lucide-react';

interface DialogContextType {
  isOpen: boolean;
  onClose: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ isOpen, onClose, title, children }) => {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <DialogContext.Provider value={{ isOpen, onClose }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in"
        />

        {/* Modal Window Container */}
        <div className="relative z-50 w-full max-w-lg">
          {title ? (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
              </DialogHeader>
              {children}
            </DialogContent>
          ) : (
            children
          )}
        </div>
      </div>
    </DialogContext.Provider>
  );
};

export const DialogContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => {
  const context = useContext(DialogContext);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`relative w-full rounded-lg border bg-white dark:bg-[#0f111a] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 shadow-xl p-6 overflow-hidden animate-in zoom-in-95 duration-150 ${className}`}
      {...props}
    >
      {context && (
        <button
          onClick={context.onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-md p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {children}
    </div>
  );
};

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`flex flex-col space-y-1.5 pb-4 mb-4 border-b border-slate-100 dark:border-white/5 ${className}`} {...props}>
    {children}
  </div>
);

export const DialogTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h2 className={`text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight ${className}`} {...props}>
    {children}
  </h2>
);

export const DialogDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-xs text-slate-600 dark:text-slate-400 leading-relaxed ${className}`} {...props}>
    {children}
  </p>
);

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-white/5 ${className}`} {...props}>
    {children}
  </div>
);
