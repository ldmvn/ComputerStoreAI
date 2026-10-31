import { create } from 'zustand';

type MaintenanceState = {
  active: boolean;
  message: string;
  activate: (message: string) => void;
  deactivate: () => void;
};

export const useMaintenanceStore = create<MaintenanceState>(set => ({
  active: false,
  message: '',
  activate: (message) => set({ active: true, message }),
  deactivate: () => set({ active: false, message: '' }),
}));
