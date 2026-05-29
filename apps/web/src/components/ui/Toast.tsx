'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ── Variant styles ────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ToastVariant, { bar: string; icon: string; text: string }> = {
  success: {
    bar:  'bg-emerald-500',
    icon: '✓',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  error: {
    bar:  'bg-red-500',
    icon: '✕',
    text: 'text-red-700 dark:text-red-300',
  },
  warning: {
    bar:  'bg-amber-400',
    icon: '!',
    text: 'text-amber-700 dark:text-amber-300',
  },
  info: {
    bar:  'bg-blue-500',
    icon: 'i',
    text: 'text-blue-700 dark:text-blue-300',
  },
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `toast-${++counter.current}`;
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const ctx: ToastContextValue = {
    toast:   addToast,
    success: (m) => addToast(m, 'success'),
    error:   (m) => addToast(m, 'error'),
    warning: (m) => addToast(m, 'warning'),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const s = VARIANT_STYLES[t.variant];
          return (
            <div key={t.id}
              className="pointer-events-auto flex items-start gap-3 min-w-72 max-w-sm rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-in slide-in-from-right-5 fade-in duration-200">
              {/* Colored side bar */}
              <div className={`w-1 self-stretch flex-shrink-0 ${s.bar}`} />

              {/* Icon */}
              <div className={`mt-3 text-sm font-bold w-4 flex-shrink-0 ${s.text}`}>{s.icon}</div>

              {/* Message */}
              <p className="flex-1 py-3 pr-2 text-sm text-gray-800 dark:text-gray-100">{t.message}</p>

              {/* Dismiss */}
              <button onClick={() => dismiss(t.id)}
                className="mt-2 mr-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
