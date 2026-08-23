import { useCallback, useEffect, useRef, useState } from "react";

export type CapsuleCategory = "general" | "media" | "audio" | "power" | "network" | "timer" | "clipboard" | "privacy" | "device";
export type CapsulePriority = "low" | "normal" | "high";
export type Capsule = { id: number; message: string; detail?: string; category: CapsuleCategory; priority: CapsulePriority; duration: number; rateKey?: string; group?: string };
export type Announce = (message: string, duration?: number, options?: Partial<Pick<Capsule, "category" | "priority" | "detail" | "rateKey" | "group">>) => void;
export type AnnounceSequence = (items: Array<{ message: string; duration: number }>, options?: Partial<Pick<Capsule, "category" | "priority" | "group">>) => void;
const priorityRank = { low: 0, normal: 1, high: 2 } as const;

export function useTransientActivity() {
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const current = useRef<Capsule | null>(null);
  const queue = useRef<Capsule[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const nextId = useRef(0);
  const lastRate = useRef(new Map<string, number>());
  const enabled = useRef<Set<CapsuleCategory> | null>(null);
  const minimumPriority = useRef<CapsulePriority>("low");
  const showRef = useRef<(next: Capsule | null) => void>(() => undefined);

  const show = useCallback((next: Capsule | null) => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    current.current = next;
    setCapsule(next);
    if (!next) return;
    timer.current = window.setTimeout(() => showRef.current(queue.current.shift() ?? null), next.duration);
  }, []);
  showRef.current = show;

  const push = useCallback((input: Omit<Capsule, "id"> & { replaceGroup?: boolean }) => {
    if (enabled.current && !enabled.current.has(input.category) && input.category !== "general") return;
    if (priorityRank[input.priority] < priorityRank[minimumPriority.current]) return;
    const now = Date.now();
    if (lastRate.current.size > 32) for (const [key, time] of lastRate.current) if (now - time > 60_000) lastRate.current.delete(key);
    if (input.rateKey) {
      const last = lastRate.current.get(input.rateKey) ?? 0;
      lastRate.current.set(input.rateKey, now);
      if (now - last < 180 && current.current?.rateKey !== input.rateKey) return;
    }
    const { replaceGroup = true, ...capsuleInput } = input;
    const next = { ...capsuleInput, id: ++nextId.current };
    if (replaceGroup && next.group) queue.current = queue.current.filter((item) => item.group !== next.group);
    if (replaceGroup && next.group && current.current?.group === next.group) return show(next);
    if (current.current?.rateKey && current.current.rateKey === next.rateKey) return show(next);
    if (!current.current) return show(next);
    if (priorityRank[next.priority] > priorityRank[current.current.priority]) {
      queue.current.unshift(current.current);
      return show(next);
    }
    queue.current.push(next);
    queue.current.sort((left, right) => priorityRank[right.priority] - priorityRank[left.priority]);
  }, [show]);

  const announce = useCallback((message: string, duration = 2_400, options: Partial<Pick<Capsule, "category" | "priority" | "detail" | "rateKey" | "group">> = {}) => {
    push({ message, duration, category: options.category ?? "general", priority: options.priority ?? "normal", detail: options.detail, rateKey: options.rateKey, group: options.group });
  }, [push]);

  const announceSequence = useCallback((items: Array<{ message: string; duration: number }>, options: Partial<Pick<Capsule, "category" | "priority" | "group">> = {}) => {
    items.forEach((item, index) => push({ ...item, category: options.category ?? "general", priority: options.priority ?? "low", group: options.group, replaceGroup: index === 0 }));
  }, [push]);

  const setEnabledCategories = useCallback((categories: CapsuleCategory[]) => {
    enabled.current = new Set(categories);
    queue.current = queue.current.filter((item) => enabled.current?.has(item.category) || item.category === "general");
    if (current.current && current.current.category !== "general" && !enabled.current.has(current.current.category)) showRef.current(queue.current.shift() ?? null);
  }, []);

  const setMinimumPriority = useCallback((priority: CapsulePriority) => {
    minimumPriority.current = priority;
    queue.current = queue.current.filter((item) => priorityRank[item.priority] >= priorityRank[priority]);
    if (current.current && priorityRank[current.current.priority] < priorityRank[priority]) showRef.current(queue.current.shift() ?? null);
  }, []);

  useEffect(() => () => { if (timer.current !== undefined) window.clearTimeout(timer.current); }, []);
  return { activity: capsule?.message ?? null, capsule, announce, announceSequence, setEnabledCategories, setMinimumPriority };
}
