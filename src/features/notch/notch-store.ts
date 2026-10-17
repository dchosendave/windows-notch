import { create } from "zustand";

export type NotchMode = "idle" | "media" | "companion" | "system" | "productivity" | "command" | "settings" | "files";
export type NotchPhase = "collapsed" | "hover-preview" | "attached" | "temporary" | "interaction-locked";

type NotchStore = {
  phase: NotchPhase;
  resumePhase: Exclude<NotchPhase, "collapsed" | "interaction-locked"> | null;
  mode: NotchMode;
  setPhase: (phase: NotchPhase) => void;
  lockInteraction: () => void;
  unlockInteraction: () => void;
  setMode: (mode: NotchMode) => void;
};

export const useNotchStore = create<NotchStore>((set) => ({
  phase: "collapsed",
  resumePhase: null,
  mode: "idle",
  setPhase: (phase) => set({ phase, resumePhase: null }),
  lockInteraction: () => set((state) => state.phase === "interaction-locked" ? state : {
    phase: "interaction-locked",
    resumePhase: state.phase === "collapsed" ? "temporary" : state.phase,
  }),
  unlockInteraction: () => set((state) => ({ phase: state.resumePhase ?? "attached", resumePhase: null })),
  setMode: (mode) => set({ mode }),
}));
