'use client';

import { useRef, useState } from 'react';
import { Send } from 'lucide-react';

const MAX_LENGTH = 2000; // mirrors backend AI_CHAT_MAX_LENGTH default (backend/src/ai/config/ai.config.js)

export default function AIChatInput({ disabled, sending, onSend }: { disabled: boolean; sending: boolean; onSend: (text: string) => void }) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || sending) return;
    onSend(trimmed);
    setValue('');
    requestAnimationFrame(() => { if (ref.current) ref.current.style.height = 'auto'; });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-slate-100 p-3">
      {disabled && (
        <p className="mb-2 text-center text-xs text-slate-400">Tính năng trò chuyện AI đang được phát triển.</p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={value}
          onChange={e => { setValue(e.target.value); autoGrow(e.target); }}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          maxLength={MAX_LENGTH}
          rows={1}
          placeholder={disabled ? 'Chatbot AI đang được phát triển…' : 'Nhập tin nhắn…'}
          aria-label="Nhập tin nhắn cho Chatbot AI"
          className="max-h-[120px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || sending || !value.trim()}
          aria-label="Gửi tin nhắn"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
