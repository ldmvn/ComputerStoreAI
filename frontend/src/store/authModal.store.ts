'use client';
import { create } from 'zustand';

type AuthModalState = {
  isOpen: boolean;
  /** Callback chạy 1 lần sau khi login thành công; null = không có pending action */
  pendingCallback: (() => void) | null;
  /** Mở modal thông thường, không có pending action */
  open: () => void;
  /**
   * Mở modal kèm callback sẽ được gọi ngay sau khi login thành công.
   * Callback được xóa ngay sau khi gọi (one-shot) để tránh gọi lại.
   */
  openWithCallback: (callback: () => void) => void;
  close: () => void;
  /** Gọi pending callback (nếu có) rồi xóa nó — dùng bởi LoginModal */
  firePendingCallback: () => void;
};

export const useAuthModal = create<AuthModalState>((set, get) => ({
  isOpen: false,
  pendingCallback: null,
  open: () => set({ isOpen: true, pendingCallback: null }),
  openWithCallback: (callback) => set({ isOpen: true, pendingCallback: callback }),
  close: () => set({ isOpen: false, pendingCallback: null }),
  firePendingCallback: () => {
    const cb = get().pendingCallback;
    set({ pendingCallback: null });
    cb?.();
  },
}));