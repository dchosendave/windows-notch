import { create } from "zustand";

import {
  defaultSettings,
  type HaminSettings,
} from "@/features/settings/settings-schema";

type SettingsStore = {
  settings: HaminSettings;
  ready: boolean;
  error: string | null;
  setSettings: (settings: HaminSettings) => void;
  patchSettings: (settings: Partial<HaminSettings>) => void;
  setReady: (ready: boolean) => void;
  setError: (error: string | null) => void;
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: defaultSettings,
  ready: false,
  error: null,
  setSettings: (settings) => set({ settings }),
  patchSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),
  setReady: (ready) => set({ ready }),
  setError: (error) => set({ error }),
}));
