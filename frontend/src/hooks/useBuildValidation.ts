'use client';

import { useEffect, useRef, useState } from 'react';
import { validateBuildPc } from '@/services/buildPc.service';
import type { ValidateData, ValidateRequest } from '@/types/buildPc.type';
import type { PickedItem } from '@/types/buildPc.type';

export type ValidationStatus = 'idle' | 'loading' | 'ok' | 'error';

export type ValidationState = {
  status: ValidationStatus;
  result: ValidateData | null;
  networkError: boolean;
};

export function useBuildValidation(items: Record<string, PickedItem>): ValidationState {
  const [state, setState] = useState<ValidationState>({ status: 'idle', result: null, networkError: false });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const itemsKey = JSON.stringify(
    Object.entries(items).map(([slot, item]) => ({ slot, id: item.product.id, qty: item.quantity }))
  );

  useEffect(() => {
    const entries = Object.entries(items);
    if (entries.length === 0) {
      setState({ status: 'idle', result: null, networkError: false });
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      setState(s => ({ ...s, status: 'loading', networkError: false }));

      const body: ValidateRequest = {
        items: entries.map(([slot, item]) => ({
          slot,
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      validateBuildPc(body, controller.signal)
        .then(res => setState({ status: 'ok', result: res.data, networkError: false }))
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          setState(s => ({ ...s, status: 'error', networkError: true }));
        });
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  return state;
}
