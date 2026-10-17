// Pure notch rules, kept free of React and Tauri so they can be tested directly with Node.
import type { NotchMode, NotchPhase } from "./notch-store";

export type ExpansionReason = "click" | "hover";

export const MODE_ORDER: Record<NotchMode, number> = { idle: 0, media: 0, companion: 1, productivity: 2, system: 3, command: 4, files: 4, settings: 5 };

/** Views further right in MODE_ORDER slide in from the right. */
export function viewDirection(next: NotchMode, previous: NotchMode): 1 | -1 {
  return MODE_ORDER[next] >= MODE_ORDER[previous] ? 1 : -1;
}

/** A click attaches the notch to the top edge; hovering only previews it. */
export function expansionPhase(reason: ExpansionReason): NotchPhase {
  return reason === "click" ? "attached" : "hover-preview";
}

export function isAttached(phase: NotchPhase, resumePhase: NotchPhase | null) {
  return phase === "attached" || (phase === "interaction-locked" && resumePhase === "attached");
}

/**
 * Only the attached dashboard/media view collapses on inactivity. Browsing commands,
 * settings, system controls, or timers is intentional; those close through selection,
 * Back, Escape, or focus loss.
 */
export function shouldAutoCollapse({ phase, mode, inactivityMs, editing }: { phase: NotchPhase; mode: NotchMode; inactivityMs: number; editing: boolean }) {
  return phase === "attached" && inactivityMs > 0 && (mode === "idle" || mode === "media") && !editing;
}
