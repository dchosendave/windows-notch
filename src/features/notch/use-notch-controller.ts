import { useCallback, useEffect, useRef, type FocusEvent } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useSettingsStore } from "@/features/settings/settings-store";
import { isEditingElement } from "@/shared/lib/dom";
import { resolveCollapsedSize, resolveExpandedSize } from "./notch-geometry";
import { expansionPhase, isAttached, shouldAutoCollapse, type ExpansionReason } from "./notch-logic";
import { useNotchStore, type NotchMode } from "./notch-store";
import { useNativeNotchWindow } from "./use-native-notch-window";

function isOnboarding() {
  const { settings, ready } = useSettingsStore.getState();
  return ready && !settings.onboardingComplete;
}

/**
 * Owns notch interaction: expanding, collapsing, inactivity, select locks, focus loss,
 * and Escape. Reads settings from the store at call time so callbacks stay stable.
 */
export function useNotchController() {
  const phase = useNotchStore((state) => state.phase);
  const resumePhase = useNotchStore((state) => state.resumePhase);
  const mode = useNotchStore((state) => state.mode);
  const setPhase = useNotchStore((state) => state.setPhase);
  const setMode = useNotchStore((state) => state.setMode);
  const lockInteraction = useNotchStore((state) => state.lockInteraction);
  const unlockInteraction = useNotchStore((state) => state.unlockInteraction);
  const inactivityMs = useSettingsStore((state) => state.settings.inactivityMs);
  const { resize, resizing } = useNativeNotchWindow();
  const inactivityTimer = useRef<number | undefined>(undefined);
  const selectOpen = useRef(false);
  const pointerInside = useRef(false);
  // Written during render by useNotchLayout; collapse() needs the latest value synchronously.
  const collapsedActivity = useRef(false);

  const clearInactivity = useCallback(() => {
    if (inactivityTimer.current !== undefined) {
      window.clearTimeout(inactivityTimer.current);
      inactivityTimer.current = undefined;
    }
  }, []);

  const expand = useCallback((reason: ExpansionReason = "click") => {
    setPhase(expansionPhase(reason));
    const settings = useSettingsStore.getState().settings;
    const size = resolveExpandedSize({ mode: useNotchStore.getState().mode, contextAwareness: settings.contextAwareness, onboarding: isOnboarding() });
    resize(size, reason === "click" ? 0 : settings.floatingOffset);
  }, [resize, setPhase]);

  const collapse = useCallback(() => {
    clearInactivity();
    setPhase("collapsed");
    const settings = useSettingsStore.getState().settings;
    resize(resolveCollapsedSize(settings.density, collapsedActivity.current), settings.floatingOffset);
  }, [clearInactivity, resize, setPhase]);

  const armInactivity = useCallback(() => {
    clearInactivity();
    const state = useNotchStore.getState();
    if (!shouldAutoCollapse({ phase: state.phase, mode: state.mode, inactivityMs, editing: isEditingElement(document.activeElement) })) return;
    inactivityTimer.current = window.setTimeout(collapse, inactivityMs);
  }, [clearInactivity, collapse, inactivityMs]);

  const openView = useCallback((nextMode: NotchMode) => {
    clearInactivity();
    setPhase("attached");
    setMode(nextMode);
  }, [clearInactivity, setMode, setPhase]);

  const expanded = phase !== "collapsed";

  useEffect(() => {
    if (expanded) armInactivity();
    else clearInactivity();
  }, [armInactivity, clearInactivity, expanded, mode]);

  // Open select menus render outside the notch; keep it open until they close.
  useEffect(() => {
    const handleSelectOpen = (event: Event) => {
      selectOpen.current = (event as CustomEvent<boolean>).detail;
      if (selectOpen.current) {
        lockInteraction();
        clearInactivity();
      } else if (useNotchStore.getState().resumePhase === "hover-preview" && !pointerInside.current) collapse();
      else {
        unlockInteraction();
        inactivityTimer.current = window.setTimeout(armInactivity, 0);
      }
    };
    window.addEventListener("hamin-select-open", handleSelectOpen);
    return () => window.removeEventListener("hamin-select-open", handleSelectOpen);
  }, [armInactivity, clearInactivity, collapse, lockInteraction, unlockInteraction]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void getCurrentWindow().onFocusChanged(({ payload }) => {
      if (!payload && useNotchStore.getState().phase !== "collapsed") collapse();
    }).then((remove) => { if (disposed) remove(); else unlisten = remove; });
    return () => { disposed = true; unlisten?.(); };
  }, [collapse]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && useNotchStore.getState().phase !== "collapsed") collapse();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapse]);

  useEffect(() => clearInactivity, [clearInactivity]);

  const surfaceHandlers = {
    onPointerEnter: () => {
      pointerInside.current = true;
      if (useNotchStore.getState().phase === "collapsed" && useSettingsStore.getState().settings.expandOnHover) expand("hover");
    },
    onPointerLeave: () => {
      pointerInside.current = false;
      if (useNotchStore.getState().phase === "hover-preview" && !selectOpen.current) collapse();
    },
    onPointerMove: armInactivity,
    onPointerDown: armInactivity,
    onKeyDown: armInactivity,
    onFocusCapture: (event: FocusEvent) => {
      if (isEditingElement(event.target)) clearInactivity();
      else armInactivity();
    },
    onBlurCapture: () => {
      clearInactivity();
      inactivityTimer.current = window.setTimeout(armInactivity, 0);
    },
  };

  return {
    phase,
    mode,
    setMode,
    expanded,
    attached: isAttached(phase, resumePhase),
    resizing,
    resize,
    collapsedActivity,
    expand,
    collapse,
    armInactivity,
    openView,
    surfaceHandlers,
  };
}

export type NotchController = ReturnType<typeof useNotchController>;

/** Keeps the native window sized to the current view and runs first-run onboarding. */
export function useNotchLayout(notch: NotchController, hasCollapsedActivity: boolean) {
  const settings = useSettingsStore((state) => state.settings);
  const ready = useSettingsStore((state) => state.ready);
  const { expanded, attached, mode, resize, expand } = notch;
  notch.collapsedActivity.current = hasCollapsedActivity;
  const onboarding = ready && !settings.onboardingComplete;
  const collapsedSize = resolveCollapsedSize(settings.density, hasCollapsedActivity);
  const expandedSize = resolveExpandedSize({ mode, contextAwareness: settings.contextAwareness, onboarding });

  useEffect(() => {
    if (expanded) resize(expandedSize, attached ? 0 : settings.floatingOffset);
  }, [attached, expanded, expandedSize.height, expandedSize.width, resize, settings.floatingOffset]);

  useEffect(() => {
    if (!expanded) resize(collapsedSize, settings.floatingOffset);
  }, [collapsedSize.height, collapsedSize.width, expanded, resize, settings.floatingOffset]);

  useEffect(() => {
    if (onboarding && !expanded) expand("click");
  }, [expand, expanded, onboarding]);

  return { onboarding, targetSize: expanded ? expandedSize : collapsedSize };
}
