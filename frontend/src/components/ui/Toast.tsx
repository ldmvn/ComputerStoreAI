'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { toastVariants, toastTransition } from './motion/transitions';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export type ToastOptions = {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  description?: string;
};

type ToastEntry = Required<Omit<ToastOptions, 'description'>> & {
  id: string;
  description?: string;
};

type ToastContextValue = {
  show: (options: ToastOptions | string) => string;
  dismiss: (id: string) => void;
  success: (message: string, description?: string) => string;
  error: (message: string, description?: string) => string;
  warning: (message: string, description?: string) => string;
  info: (message: string, description?: string) => string;
};

const DEFAULT_DURATION = 3200;

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(current => current.filter(toast => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback((options: ToastOptions | string) => {
    const config: ToastOptions = typeof options === 'string' ? { message: options } : options;
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const variant = config.variant ?? 'info';
    const duration = config.duration ?? DEFAULT_DURATION;
    const entry: ToastEntry = {
      id,
      message: config.message,
      variant,
      duration,
      description: config.description,
    };
    setToasts(current => [...current, entry]);
    if (duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    }
    return id;
  }, [dismiss]);

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach(timer => clearTimeout(timer));
      active.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({
    show,
    dismiss,
    success: (message, description) => show({ message, variant: 'success', description }),
    error: (message, description) => show({ message, variant: 'error', description, duration: 4000 }),
    warning: (message, description) => show({ message, variant: 'warning', description }),
    info: (message, description) => show({ message, variant: 'info', description }),
  }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

type VariantStyle = {
  wrapper: string;
  iconWrap: string;
  icon: string;
};

const VARIANT_STYLES: Record<ToastVariant, VariantStyle> = {
  success: {
    wrapper: 'border-green-200 bg-green-50 text-green-800',
    iconWrap: 'bg-green-100 text-green-600',
    icon: 'text-green-600',
  },
  error: {
    wrapper: 'border-red-200 bg-red-50 text-red-800',
    iconWrap: 'bg-red-100 text-red-600',
    icon: 'text-red-600',
  },
  warning: {
    wrapper: 'border-amber-200 bg-amber-50 text-amber-800',
    iconWrap: 'bg-amber-100 text-amber-600',
    icon: 'text-amber-600',
  },
  info: {
    wrapper: 'border-sky-200 bg-sky-50 text-sky-800',
    iconWrap: 'bg-sky-100 text-sky-600',
    icon: 'text-sky-600',
  },
};

function VariantIcon({ variant }: { variant: ToastVariant }) {
  const className = 'h-4 w-4';
  switch (variant) {
    case 'success':
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case 'error':
      return <XCircle className={className} aria-hidden="true" />;
    case 'warning':
      return <AlertTriangle className={className} aria-hidden="true" />;
    default:
      return <Info className={className} aria-hidden="true" />;
  }
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastEntry[]; onDismiss: (id: string) => void }) {
  return (
    <div
      role="region"
      aria-label="Thông báo"
      aria-live="polite"
      className="pointer-events-none fixed right-3 top-5 z-[9999] flex w-full max-w-[calc(100vw-24px)] flex-col gap-2.5 sm:right-5 sm:top-6 sm:max-w-[420px]"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastEntry; onDismiss: (id: string) => void }) {
  const style = VARIANT_STYLES[toast.variant];
  const role = toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status';
  return (
    <m.div
      layout
      role={role}
      data-testid="app-toast"
      data-variant={toast.variant}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-[13px] leading-5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)] sm:text-sm ${style.wrapper}`}
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={toastTransition}
    >
      <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${style.iconWrap}`}>
        <VariantIcon variant={toast.variant} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium">{toast.message}</p>
        {toast.description && <p className="mt-0.5 break-words text-[12px] opacity-80">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dong thong bao"
        className={`-mr-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 ${style.icon}`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </m.div>
  );
}
