'use client';

import { useCallback, useRef, useState } from 'react';
import { postAiBuildPc } from '@/services/aiBuildPc.service';
import { useAuthStore } from '@/store/auth.store';
import type { AiBuildPcRequest, AiBuildPcResult } from '@/types/aiBuildPc.type';

const STORAGE_KEY = 'ai-build-pc:latest';
const STORAGE_VERSION = 2;

type SavedState = {
  v: number;
  prompt: string;
  result: AiBuildPcResult;
  savedAt: number;
};

function loadSaved(): { prompt: string; result: AiBuildPcResult } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedState;
    if (parsed.v !== STORAGE_VERSION || !parsed.result?.tiers?.length) return null;
    return { prompt: parsed.prompt, result: parsed.result };
  } catch {
    return null;
  }
}

function save(prompt: string, result: AiBuildPcResult) {
  try {
    const data: SavedState = { v: STORAGE_VERSION, prompt, result, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function clearAiBuildPcStorage() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export type AiBuildPcState = 'idle' | 'loading' | 'done' | 'error';

export function useAiBuildPc() {
  const token = useAuthStore(s => s.token);
  const abortRef = useRef<AbortController | null>(null);

  const saved = loadSaved();
  const [state, setState] = useState<AiBuildPcState>(saved ? 'done' : 'idle');
  const [result, setResult] = useState<AiBuildPcResult | null>(saved?.result ?? null);
  const [lastPrompt, setLastPrompt] = useState<string>(saved?.prompt ?? '');
  const [errorMsg, setErrorMsg] = useState('');

  const generate = useCallback(async (request: AiBuildPcRequest) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState('loading');
    setErrorMsg('');
    setLastPrompt(request.prompt || '');

    try {
      const res = await postAiBuildPc(request, token, ctrl.signal);
      const data = res.data;
      if (data.success === false || !data.tiers?.length) {
        setState('error');
        setErrorMsg(data.error || 'Không thể tạo cấu hình. Vui lòng thử lại.');
        setResult(null);
        return;
      }
      setResult(data);
      setState('done');
      save(request.prompt || '', data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Đã xảy ra lỗi.';
      setState('error');
      setErrorMsg(
        msg.includes('429') ? 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.'
          : msg.includes('501') ? 'Tính năng AI Build PC chưa sẵn sàng.'
          : msg.includes('timeout') || msg.includes('504') ? 'Quá thời gian xử lý. Vui lòng thử lại.'
          : msg || 'Đã xảy ra lỗi.',
      );
      setResult(null);
    }
  }, [token]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState('idle');
    setResult(null);
    setLastPrompt('');
    setErrorMsg('');
    clearAiBuildPcStorage();
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState(result ? 'done' : 'idle');
  }, [result]);

  return { state, result, lastPrompt, errorMsg, generate, reset, cancel };
}
