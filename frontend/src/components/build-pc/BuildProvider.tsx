'use client';

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { getBuildPcSlots } from '@/services/buildPc.service';
import { useBuildValidation } from '@/hooks/useBuildValidation';
import type { BuildSlot, BuildMeta, BuildPcProduct, PickedItem, ValidateData } from '@/types/buildPc.type';
import type { ValidationStatus } from '@/hooks/useBuildValidation';

const STORAGE_KEY = 'build-pc:v1';

type BuildState = {
  items: Record<string, PickedItem>;
};

export type SavedBuildReference = {
  fingerprint: string;
  shareCode: string;
};

type BuildAction =
  | { type: 'SELECT'; slotSlug: string; product: BuildPcProduct }
  | { type: 'REMOVE'; slotSlug: string }
  | { type: 'SET_QUANTITY'; slotSlug: string; quantity: number }
  | { type: 'CLEAR' }
  | { type: 'RESTORE'; items: Record<string, PickedItem> };

function reducer(state: BuildState, action: BuildAction): BuildState {
  switch (action.type) {
    case 'SELECT':
      return { items: { ...state.items, [action.slotSlug]: { product: action.product, quantity: 1 } } };
    case 'REMOVE': {
      const next = { ...state.items };
      delete next[action.slotSlug];
      return { items: next };
    }
    case 'SET_QUANTITY': {
      const item = state.items[action.slotSlug];
      if (!item) return state;
      return { items: { ...state.items, [action.slotSlug]: { ...item, quantity: Math.max(1, action.quantity) } } };
    }
    case 'CLEAR':
      return { items: {} };
    case 'RESTORE':
      return { items: action.items };
  }
}

type BuildContextValue = {
  slots: BuildSlot[];
  meta: BuildMeta | null;
  slotsLoading: boolean;
  slotsError: string | null;
  items: Record<string, PickedItem>;
  activeSlotSlug: string | null;
  openPicker: (slotSlug: string) => void;
  closePicker: () => void;
  selectProduct: (slotSlug: string, product: BuildPcProduct) => void;
  removeProduct: (slotSlug: string) => void;
  setItemQuantity: (slotSlug: string, quantity: number) => void;
  clearAll: () => void;
  validationStatus: ValidationStatus;
  validationResult: ValidateData | null;
  validationNetworkError: boolean;
  savedBuild: SavedBuildReference | null;
  setSavedBuild: (savedBuild: SavedBuildReference | null) => void;
  // Compat toggle — shared across all slot pickers, session-only (resets on reload)
  compatOn: boolean;
  setCompatOn: (v: boolean) => void;
};

const BuildContext = createContext<BuildContextValue | null>(null);

export function useBuild() {
  const ctx = useContext(BuildContext);
  if (!ctx) throw new Error('useBuild must be used inside BuildProvider');
  return ctx;
}

export default function BuildProvider({ children }: { children: React.ReactNode }) {
  const [slots, setSlots] = useState<BuildSlot[]>([]);
  const [meta, setMeta] = useState<BuildMeta | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [{ items }, dispatch] = useReducer(reducer, { items: {} });
  const [activeSlotSlug, setActiveSlotSlug] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [compatOn, setCompatOn] = useState(false);
  const [savedBuild, setSavedBuild] = useState<SavedBuildReference | null>(null);
  const { status: validationStatus, result: validationResult, networkError: validationNetworkError } = useBuildValidation(items);

  // Load slots
  useEffect(() => {
    const controller = new AbortController();
    getBuildPcSlots(controller.signal)
      .then(res => {
        setSlots(res.data);
        setMeta(res.meta);
        setSlotsError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        const msg = err instanceof Error ? err.message : 'Không tải được danh sách slot.';
        setSlotsError(msg);
      })
      .finally(() => setSlotsLoading(false));
    return () => controller.abort();
  }, []);

  // Hydrate from localStorage (after mount to avoid SSR mismatch)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, PickedItem>;
        dispatch({ type: 'RESTORE', items: parsed });
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items, hydrated]);

  const openPicker = useCallback((slotSlug: string) => setActiveSlotSlug(slotSlug), []);
  const closePicker = useCallback(() => setActiveSlotSlug(null), []);

  const selectProduct = useCallback((slotSlug: string, product: BuildPcProduct) => {
    dispatch({ type: 'SELECT', slotSlug, product });
    setActiveSlotSlug(null);
  }, []);

  const removeProduct = useCallback((slotSlug: string) => dispatch({ type: 'REMOVE', slotSlug }), []);
  const setItemQuantity = useCallback((slotSlug: string, quantity: number) => dispatch({ type: 'SET_QUANTITY', slotSlug, quantity }), []);
  const clearAll = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  return (
    <BuildContext.Provider value={{ slots, meta, slotsLoading, slotsError, items, activeSlotSlug, openPicker, closePicker, selectProduct, removeProduct, setItemQuantity, clearAll, validationStatus, validationResult, validationNetworkError, savedBuild, setSavedBuild, compatOn, setCompatOn }}>
      {children}
    </BuildContext.Provider>
  );
}
