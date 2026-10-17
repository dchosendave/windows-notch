// Capsule scheduling rules, independent of React so they can be tested with a fake clock.

export type CapsuleCategory = "general" | "media" | "audio" | "power" | "network" | "timer" | "clipboard" | "privacy" | "device";
export type CapsulePriority = "low" | "normal" | "high";
export type Capsule = { id: number; message: string; detail?: string; category: CapsuleCategory; priority: CapsulePriority; duration: number; rateKey?: string; group?: string; occurredAt: number };
export type CapsuleInput = Omit<Capsule, "id" | "occurredAt"> & { replaceGroup?: boolean };

export type Scheduler = {
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  now: () => number;
};

const priorityRank = { low: 0, normal: 1, high: 2 } as const;
/** Repeats of the same rate key inside this window are dropped unless that key is showing. */
const RATE_WINDOW_MS = 180;

const browserScheduler: Scheduler = {
  setTimeout: (callback, ms) => window.setTimeout(callback, ms),
  clearTimeout: (handle) => window.clearTimeout(handle as number),
  now: () => Date.now(),
};

export class CapsuleQueue {
  current: Capsule | null = null;
  private queue: Capsule[] = [];
  private timer: unknown;
  private nextId = 0;
  private lastRate = new Map<string, number>();
  private enabled: Set<CapsuleCategory> | null = null;
  private minimumPriority: CapsulePriority = "low";
  private readonly onShow: (capsule: Capsule | null) => void;
  private readonly scheduler: Scheduler;

  constructor(onShow: (capsule: Capsule | null) => void, scheduler: Scheduler = browserScheduler) {
    this.onShow = onShow;
    this.scheduler = scheduler;
  }

  get pending(): readonly Capsule[] { return this.queue; }

  push(input: CapsuleInput) {
    if (this.enabled && !this.enabled.has(input.category) && input.category !== "general") return;
    if (priorityRank[input.priority] < priorityRank[this.minimumPriority]) return;
    const now = this.scheduler.now();
    if (this.lastRate.size > 32) for (const [key, time] of this.lastRate) if (now - time > 60_000) this.lastRate.delete(key);
    if (input.rateKey) {
      const last = this.lastRate.get(input.rateKey) ?? 0;
      this.lastRate.set(input.rateKey, now);
      if (now - last < RATE_WINDOW_MS && this.current?.rateKey !== input.rateKey) return;
    }
    const { replaceGroup = true, ...capsuleInput } = input;
    const next: Capsule = { ...capsuleInput, id: ++this.nextId, occurredAt: now };
    if (replaceGroup && next.group) this.queue = this.queue.filter((item) => item.group !== next.group);
    if (replaceGroup && next.group && this.current?.group === next.group) return this.show(next);
    if (this.current?.rateKey && this.current.rateKey === next.rateKey) return this.show(next);
    if (!this.current) return this.show(next);
    if (priorityRank[next.priority] > priorityRank[this.current.priority]) {
      // A more important capsule interrupts; the current one resumes afterwards.
      this.queue.unshift(this.current);
      return this.show(next);
    }
    this.queue.push(next);
    this.queue.sort((left, right) => priorityRank[right.priority] - priorityRank[left.priority]);
  }

  setEnabledCategories(categories: CapsuleCategory[]) {
    const enabled = new Set(categories);
    this.enabled = enabled;
    this.queue = this.queue.filter((item) => enabled.has(item.category) || item.category === "general");
    if (this.current && this.current.category !== "general" && !enabled.has(this.current.category)) this.showNext();
  }

  setMinimumPriority(priority: CapsulePriority) {
    this.minimumPriority = priority;
    this.queue = this.queue.filter((item) => priorityRank[item.priority] >= priorityRank[priority]);
    if (this.current && priorityRank[this.current.priority] < priorityRank[priority]) this.showNext();
  }

  dispose() {
    if (this.timer !== undefined) this.scheduler.clearTimeout(this.timer);
    this.timer = undefined;
  }

  private showNext() {
    this.show(this.queue.shift() ?? null);
  }

  private show(next: Capsule | null) {
    this.dispose();
    this.current = next;
    this.onShow(next);
    if (next) this.timer = this.scheduler.setTimeout(() => this.showNext(), next.duration);
  }
}
