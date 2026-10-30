'use client';

import { useEffect, useId, useRef } from 'react';
import { m } from 'motion/react';
import { X } from 'lucide-react';
import { overlayVariants, dialogVariants, overlayTransition, panelTransition } from './motion/transitions';

export default function Modal({ title, onClose, children, busy = false, footer, size, customHeader, scrollableBody }: {
  title: string; onClose: () => void; children: React.ReactNode; busy?: boolean;
  footer?: React.ReactNode; size?: 'lg';
  customHeader?: React.ReactNode;
  scrollableBody?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]') || []).filter(element => element.getClientRects().length);
    (focusable()[0] || ref.current)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0]; const last = items[items.length - 1];
      if (!first) { event.preventDefault(); ref.current?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  const panelWidth = size === 'lg' ? 'max-w-5xl' : 'max-w-3xl';
  const useColumnLayout = !!(footer || scrollableBody || customHeader);

  return (
    <m.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={overlayTransition}
      onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}
    >
      {useColumnLayout ? (
        <m.div
          ref={ref}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-busy={busy}
          className={`ui-modal flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl ${panelWidth}`}
          variants={dialogVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={panelTransition}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
            {customHeader ?? (
              <h2 id={titleId} className="min-w-0 truncate text-xl font-semibold" title={title}>{title}</h2>
            )}
            <button type="button" disabled={busy} onClick={onClose} aria-label="Đóng hộp thoại" className="ui-button ml-2 shrink-0 rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {children}
          </div>
          {footer && (
            <div className="shrink-0 border-t border-slate-200 px-5 py-4 sm:px-6">
              {footer}
            </div>
          )}
        </m.div>
      ) : (
        <m.div
          ref={ref}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-busy={busy}
          className={`ui-modal max-h-[90dvh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6 ${panelWidth}`}
          variants={dialogVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={panelTransition}
        >
          <div className="mb-5 flex items-center justify-between gap-3"><h2 id={titleId} className="text-xl font-semibold">{title}</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Đóng hộp thoại" className="ui-button rounded-lg p-2 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button></div>
          {children}
        </m.div>
      )}
    </m.div>
  );
}
