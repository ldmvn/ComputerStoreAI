'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { overlayVariants, dialogVariants, overlayTransition, panelTransition } from './motion/transitions';

export type ConfirmTone = 'danger' | 'warning' | 'info';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  destructive?: boolean;
};

type ConfirmRequest = Required<Omit<ConfirmOptions, 'description' | 'tone' | 'destructive'>> & {
  description?: string;
  tone: ConfirmTone;
  destructive: boolean;
  resolve: (value: boolean) => void;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue['confirm'] {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((value: boolean) => {
    setRequest(current => {
      if (current) current.resolve(value);
      return null;
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const config: ConfirmOptions = typeof options === 'string' ? { title: options } : options;
    return new Promise<boolean>(resolve => {
      setRequest({
        title: config.title,
        description: config.description,
        confirmLabel: config.confirmLabel ?? (config.destructive || config.tone === 'danger' ? 'Xóa' : 'Xác nhận'),
        cancelLabel: config.cancelLabel ?? 'Hủy',
        tone: config.tone ?? (config.destructive ? 'danger' : 'info'),
        destructive: config.destructive ?? false,
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    if (!request) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false);
      if (event.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') close(true);
    };
    document.addEventListener('keydown', handleKey);
    cancelRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [request, close]);

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {request && <ConfirmDialog key="confirm" request={request} onClose={close} cancelRef={cancelRef} />}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

const TONE_STYLES: Record<ConfirmTone, { icon: string; iconWrap: string; confirmButton: string }> = {
  danger: {
    icon: 'text-red-600',
    iconWrap: 'bg-red-100 text-red-600',
    confirmButton: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
  },
  warning: {
    icon: 'text-amber-600',
    iconWrap: 'bg-amber-100 text-amber-600',
    confirmButton: 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:outline-amber-600',
  },
  info: {
    icon: 'text-primary-600',
    iconWrap: 'bg-primary-100 text-primary-600',
    confirmButton: 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:outline-primary-600',
  },
};

function ConfirmDialog({ request, onClose, cancelRef }: { request: ConfirmRequest; onClose: (value: boolean) => void; cancelRef: React.RefObject<HTMLButtonElement> }) {
  const tone = TONE_STYLES[request.tone];
  const Icon = request.destructive || request.tone === 'danger' ? Trash2 : AlertTriangle;
  return (
    <m.div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/45 px-4 py-4 backdrop-blur-[2px]"
      role="presentation"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={overlayTransition}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(false); }}
    >
      <m.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={request.description ? 'confirm-dialog-description' : undefined}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
        variants={dialogVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={panelTransition}
      >
        <div className="flex items-start gap-4">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.iconWrap}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-base font-semibold text-slate-900">{request.title}</h2>
            {request.description && <p id="confirm-dialog-description" className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{request.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => onClose(false)}
            className="ui-button -mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng hộp thoại xác nhận"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => onClose(false)}
            className="ui-button inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            {request.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onClose(true)}
            className={`ui-button inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${tone.confirmButton}`}
          >
            {request.confirmLabel}
          </button>
        </div>
      </m.div>
    </m.div>
  );
}
