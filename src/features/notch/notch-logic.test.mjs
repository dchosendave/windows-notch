import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { expansionPhase, isAttached, shouldAutoCollapse, viewDirection } from "./notch-logic.ts";
import { COLLAPSED_SIZES, VIEW_SIZES, resolveCollapsedSize, resolveExpandedSize } from "./notch-geometry.ts";
import { useNotchStore } from "./notch-store.ts";

describe("expansion", () => {
  it("attaches on click and previews on hover", () => {
    assert.equal(expansionPhase("click"), "attached");
    assert.equal(expansionPhase("hover"), "hover-preview");
  });

  it("treats a locked notch as attached only when it resumes to attached", () => {
    assert.equal(isAttached("attached", null), true);
    assert.equal(isAttached("interaction-locked", "attached"), true);
    assert.equal(isAttached("interaction-locked", "hover-preview"), false);
    assert.equal(isAttached("hover-preview", null), false);
  });
});

describe("auto-collapse", () => {
  const base = { phase: "attached", mode: "media", inactivityMs: 3000, editing: false };

  it("collapses the attached dashboard and media views", () => {
    assert.equal(shouldAutoCollapse(base), true);
    assert.equal(shouldAutoCollapse({ ...base, mode: "idle" }), true);
  });

  it("never collapses intentional views", () => {
    for (const mode of ["settings", "command", "system", "productivity", "companion", "files"]) {
      assert.equal(shouldAutoCollapse({ ...base, mode }), false, mode);
    }
  });

  it("respects Off, editing, and non-attached phases", () => {
    assert.equal(shouldAutoCollapse({ ...base, inactivityMs: 0 }), false);
    assert.equal(shouldAutoCollapse({ ...base, editing: true }), false);
    for (const phase of ["collapsed", "hover-preview", "temporary", "interaction-locked"]) {
      assert.equal(shouldAutoCollapse({ ...base, phase }), false, phase);
    }
  });
});

describe("view direction", () => {
  it("slides forward to deeper views and back to the dashboard", () => {
    assert.equal(viewDirection("settings", "idle"), 1);
    assert.equal(viewDirection("idle", "settings"), -1);
    assert.equal(viewDirection("media", "idle"), 1);
  });
});

describe("geometry", () => {
  it("uses onboarding size before anything else", () => {
    assert.deepEqual(resolveExpandedSize({ mode: "settings", contextAwareness: true, onboarding: true }), { width: 460, height: 280 });
  });

  it("grows the dashboard for adaptive actions only when app context is on", () => {
    assert.deepEqual(resolveExpandedSize({ mode: "idle", contextAwareness: true, onboarding: false }), { width: 460, height: 296 });
    assert.deepEqual(resolveExpandedSize({ mode: "media", contextAwareness: false, onboarding: false }), VIEW_SIZES.media);
    assert.deepEqual(resolveExpandedSize({ mode: "command", contextAwareness: true, onboarding: false }), VIEW_SIZES.command);
  });

  it("widens the collapsed notch when there is activity", () => {
    assert.deepEqual(resolveCollapsedSize("compact", false), COLLAPSED_SIZES.compact.minimal);
    assert.deepEqual(resolveCollapsedSize("large", true), COLLAPSED_SIZES.large.activity);
  });

  it("keeps every view inside the native window limits", () => {
    for (const size of [...Object.values(VIEW_SIZES), ...Object.values(COLLAPSED_SIZES).flatMap((sizes) => Object.values(sizes))]) {
      assert.ok(size.width >= 138 && size.width <= 520 && size.height >= 32 && size.height <= 360, JSON.stringify(size));
    }
  });
});

describe("notch store", () => {
  const reset = () => useNotchStore.setState({ phase: "collapsed", resumePhase: null, mode: "idle" });

  it("locks a collapsed notch as temporary and restores it on unlock", () => {
    reset();
    useNotchStore.getState().lockInteraction();
    assert.equal(useNotchStore.getState().phase, "interaction-locked");
    assert.equal(useNotchStore.getState().resumePhase, "temporary");
    useNotchStore.getState().unlockInteraction();
    assert.equal(useNotchStore.getState().phase, "temporary");
    assert.equal(useNotchStore.getState().resumePhase, null);
  });

  it("remembers the phase it locked from and ignores a second lock", () => {
    reset();
    useNotchStore.getState().setPhase("hover-preview");
    useNotchStore.getState().lockInteraction();
    useNotchStore.getState().lockInteraction();
    assert.equal(useNotchStore.getState().resumePhase, "hover-preview");
    useNotchStore.getState().unlockInteraction();
    assert.equal(useNotchStore.getState().phase, "hover-preview");
  });

  it("clears the resume phase when the phase is set directly", () => {
    reset();
    useNotchStore.getState().setPhase("attached");
    useNotchStore.getState().lockInteraction();
    useNotchStore.getState().setPhase("collapsed");
    assert.equal(useNotchStore.getState().resumePhase, null);
  });
});
