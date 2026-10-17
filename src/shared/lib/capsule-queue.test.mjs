import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { CapsuleQueue } from "./capsule-queue.ts";

/** Deterministic clock: timers only fire when the test advances time. */
function fakeScheduler() {
  let now = 1_000;
  let timers = [];
  return {
    now: () => now,
    setTimeout: (callback, ms) => { const timer = { callback, at: now + ms }; timers.push(timer); return timer; },
    clearTimeout: (timer) => { timers = timers.filter((item) => item !== timer); },
    advance(ms) {
      now += ms;
      for (;;) {
        const due = timers.filter((timer) => timer.at <= now).sort((a, b) => a.at - b.at)[0];
        if (!due) return;
        timers = timers.filter((timer) => timer !== due);
        due.callback();
      }
    },
  };
}

const capsule = (message, options = {}) => ({ message, duration: 1_000, category: "general", priority: "normal", ...options });

describe("CapsuleQueue", () => {
  let clock, shown, queue;
  beforeEach(() => {
    clock = fakeScheduler();
    shown = [];
    queue = new CapsuleQueue((next) => shown.push(next?.message ?? null), clock);
  });

  it("shows capsules in order and clears after the last one", () => {
    queue.push(capsule("one"));
    queue.push(capsule("two"));
    assert.deepEqual(shown, ["one"]);
    clock.advance(1_000);
    assert.deepEqual(shown, ["one", "two"]);
    clock.advance(1_000);
    assert.deepEqual(shown, ["one", "two", null]);
  });

  it("lets a higher priority interrupt and resumes the interrupted capsule", () => {
    queue.push(capsule("normal"));
    queue.push(capsule("urgent", { priority: "high" }));
    assert.equal(queue.current.message, "urgent");
    clock.advance(1_000);
    assert.equal(queue.current.message, "normal");
  });

  it("queues higher priorities ahead of lower ones", () => {
    queue.push(capsule("showing"));
    queue.push(capsule("low", { priority: "low" }));
    queue.push(capsule("normal"));
    assert.deepEqual(queue.pending.map((item) => item.message), ["normal", "low"]);
  });

  it("replaces the showing capsule when the same rate key repeats", () => {
    queue.push(capsule("Volume 40%", { rateKey: "volume" }));
    clock.advance(50);
    queue.push(capsule("Volume 43%", { rateKey: "volume" }));
    assert.equal(queue.current.message, "Volume 43%");
    assert.equal(queue.pending.length, 0);
  });

  it("drops a rapid repeat of a rate key that is not showing", () => {
    queue.push(capsule("showing", { duration: 5_000 }));
    queue.push(capsule("first", { rateKey: "device" }));
    clock.advance(100);
    queue.push(capsule("second", { rateKey: "device" }));
    assert.deepEqual(queue.pending.map((item) => item.message), ["first"]);
  });

  it("replaces queued and showing capsules from the same group", () => {
    queue.push(capsule("Now playing", { group: "track" }));
    queue.push(capsule("Old title", { group: "track", replaceGroup: false }));
    queue.push(capsule("New track", { group: "track" }));
    assert.equal(queue.current.message, "New track");
    assert.equal(queue.pending.length, 0);
  });

  it("filters by category but always allows general capsules", () => {
    queue.setEnabledCategories(["audio"]);
    queue.push(capsule("battery", { category: "power" }));
    assert.equal(queue.current, null);
    queue.push(capsule("error"));
    assert.equal(queue.current.message, "error");
  });

  it("skips the current capsule when its category is disabled", () => {
    queue.push(capsule("battery", { category: "power" }));
    queue.push(capsule("song", { category: "media" }));
    queue.setEnabledCategories(["media"]);
    assert.equal(queue.current.message, "song");
  });

  it("enforces the minimum priority on new, queued, and showing capsules", () => {
    queue.push(capsule("low", { priority: "low" }));
    queue.push(capsule("normal"));
    queue.push(capsule("also low", { priority: "low" }));
    queue.setMinimumPriority("normal");
    assert.equal(queue.current.message, "normal");
    assert.equal(queue.pending.length, 0);
    queue.push(capsule("ignored", { priority: "low" }));
    assert.equal(queue.pending.length, 0);
  });

  it("stops the timer on dispose", () => {
    queue.push(capsule("one"));
    queue.dispose();
    clock.advance(5_000);
    assert.deepEqual(shown, ["one"]);
  });
});
