'use client';

import { AlertCircle, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import MascotAvatar from '@/components/layout/support-widget/MascotAvatar';
import type { ChatMessage } from '@/types/ai.type';
import { prepareCitationDisplay } from '@/lib/aiCitations';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatAiReply(text: string): string {
  let safe = escapeHtml(text);
  safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*(.+?)\*/g, '<em>$1</em>');
  safe = safe.replace(/`(.+?)`/g, '<code class="rounded bg-slate-200 px-1 py-0.5 text-xs">$1</code>');
  safe = safe.replace(/^### (.+)$/gm, '<strong class="text-sm">$1</strong>');
  safe = safe.replace(/^## (.+)$/gm, '<strong class="text-sm">$1</strong>');
  return safe;
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5" aria-label="Đang trả lời">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 motion-reduce:animate-none"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </span>
  );
}

export default function AIChatMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary-600 px-3.5 py-2.5 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }
  const display = prepareCitationDisplay(message.content, message.citations);

  return (
    <div className="flex items-start gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-primary-200">
        <MascotAvatar />
      </span>
      <div
        className={`max-w-[80%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm ${
          message.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
        }`}
      >
        {message.status === 'error' && (
          <span className="mb-1 flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Lỗi
          </span>
        )}
        {message.status === 'sending' ? <TypingDots /> : (
          <div
            className="ai-reply-content break-words whitespace-pre-wrap [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: formatAiReply(display.text) }}
          />
        )}
        {message.status === 'sent' && display.sources.length > 0 && (
          <details className="group mt-3 min-w-0 rounded-xl border border-primary-100 bg-white text-xs">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-xl px-2.5 py-2 font-medium text-primary-700 outline-none focus-visible:ring-2 focus-visible:ring-primary-400 [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 whitespace-nowrap">Nguồn tham khảo ({display.sources.length})</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <ol className="space-y-2 border-t border-primary-100 px-2.5 py-2" aria-label="Nguồn tham khảo">
              {display.sources.map(source => (
                <li key={source.key} className="flex min-w-0 items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary-50 font-semibold text-primary-700" aria-label={`Nguồn ${source.sourceNumber}`}>{source.sourceNumber}</span>
                  {source.href ? <Link href={source.href} prefetch={false} title={source.title} className="line-clamp-2 min-w-0 break-words text-slate-700 underline decoration-primary-200 underline-offset-2 hover:text-primary-700 focus-visible:outline-primary-500">{source.title}</Link> : <span title={source.title} className="line-clamp-2 min-w-0 break-words text-slate-600">{source.title}</span>}
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </div>
  );
}
