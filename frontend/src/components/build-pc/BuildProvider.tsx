'use client';

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useRef } from 'react';
import { getBuildPcSlots } from '@/services/buildPc.service';
import { useBuildValidation } from '@/hooks/useBuildValidation';
import { useAuthStore } from '@/store/auth.store';
import type { BuildSlot, BuildMeta, BuildPcProduct, PickedItem, ValidateData } from '@/types/buildPc.type';
import type { ValidationStatus } from '@/hooks/useBuildValidation';

/** Trả về khóa localStorage phân tách theo userId hoặc 'guest' */
function buildStorageKey(userId: number | null | undefined): string {
  return userId ? `build-pc:user:${userId}` : 'build-pc:guest';
}

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
  const [compatOn, setCompatOn] = useState(false);
  const [savedBuild, setSavedBuild] = useState<SavedBuildReference | null>(null);
  const { status: validationStatus, result: validationResult, networkError: validationNetworkError } = useBuildValidation(items);

  // Đọc userId từ auth store — isHydrated đảm bảo auth đã settle trước khi hydrate Build PC
  const userId = useAuthStore(state => state.user?.id ?? null);
  const authHydrated = useAuthStore(state => state.isHydrated);

  /**
   * storageKey phụ thuộc vào userId.
   * Khi auth chưa hydrate, userId = null → dùng 'guest'. Sau khi auth settle,
   * nếu user đã login thì key đổi sang user-specific và trigger re-hydrate.
   */
  const storageKey = buildStorageKey(userId);

  /**
   * hydrated: true sau khi đã load xong từ localStorage cho userId hiện tại.
   * Dùng ref để tránh closure cũ ghi đè khi key chưa đổi kịp.
   */
  const hydratedKeyRef = useRef<string | null>(null);

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

  /**
   * Hydrate từ localStorage khi storageKey thay đổi (tức là khi auth settle
   * hoặc khi user login/logout). Trước khi hydrate: CLEAR ngay để tránh flash
   * dữ liệu của user cũ.
   */
  useEffect(() => {
    // Chờ auth settle để biết chắc userId
    if (!authHydrated) return;

    // Nếu key không đổi (đã hydrate cho key này rồi) thì bỏ qua
    if (hydratedKeyRef.current === storageKey) return;

    // Reset ngay lập tức trước khi đọc storage mới — ngăn flash dữ liệu cũ
    dispatch({ type: 'CLEAR' });
    setSavedBuild(null);

    // Hydrate từ storage của user hiện tại
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, PickedItem>;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          dispatch({ type: 'RESTORE', items: parsed });
        }
      }
    } catch {
      // ignore parse errors — storage bị lỗi, bắt đầu với state trống
    }

    hydratedKeyRef.current = storageKey;
  }, [authHydrated, storageKey]);

  /** Persist to localStorage khi items thay đổi, sau khi đã hydrate */
  useEffect(() => {
    // Chỉ persist sau khi đã hydrate cho key hiện tại
    if (hydratedKeyRef.current !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items, storageKey]);

  /**
   * Đồng bộ giữa các tab: lắng nghe storage event.
   * Khi tab khác cập nhật cùng key, reload dữ liệu vào tab này.
   */
  useEffect(() => {
    if (!authHydrated) return;

    function onStorage(event: StorageEvent) {
      if (event.key !== storageKey) return;
      if (event.storageArea !== localStorage) return;
      try {
        if (!event.newValue) {
          dispatch({ type: 'CLEAR' });
          return;
        }
        const parsed = JSON.parse(event.newValue) as Record<string, PickedItem>;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          dispatch({ type: 'RESTORE', items: parsed });
        }
      } catch {
        // ignore
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [authHydrated, storageKey]);

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
