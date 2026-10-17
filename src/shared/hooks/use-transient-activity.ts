import { useCallback, useEffect, useRef, useState } from "react";
import { CapsuleQueue, type Capsule, type CapsuleCategory, type CapsulePriority } from "@/shared/lib/capsule-queue";

export type { Capsule, CapsuleCategory, CapsulePriority } from "@/shared/lib/capsule-queue";
export type Announce = (message: string, duration?: number, options?: Partial<Pick<Capsule, "category" | "priority" | "detail" | "rateKey" | "group">>) => void;
export type AnnounceSequence = (items: Array<{ message: string; duration: number }>, options?: Partial<Pick<Capsule, "category" | "priority" | "group">>) => void;

const HISTORY_LIMIT = 30;

export function useTransientActivity() {
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [history, setHistory] = useState<Capsule[]>([]);
  const queue = useRef<CapsuleQueue | null>(null);
  if (!queue.current) {
    queue.current = new CapsuleQueue((next) => {
      setCapsule(next);
      if (next) setHistory((items) => [next, ...items.filter((item) => item.id !== next.id)].slice(0, HISTORY_LIMIT));
    });
  }
  const engine = queue.current;

  const announce = useCallback<Announce>((message, duration = 2_400, options = {}) => {
    engine.push({ message, duration, category: options.category ?? "general", priority: options.priority ?? "normal", detail: options.detail, rateKey: options.rateKey, group: options.group });
  }, [engine]);

  const announceSequence = useCallback<AnnounceSequence>((items, options = {}) => {
    items.forEach((item, index) => engine.push({ ...item, category: options.category ?? "general", priority: options.priority ?? "low", group: options.group, replaceGroup: index === 0 }));
  }, [engine]);

  const setEnabledCategories = useCallback((categories: CapsuleCategory[]) => engine.setEnabledCategories(categories), [engine]);
  const setMinimumPriority = useCallback((priority: CapsulePriority) => engine.setMinimumPriority(priority), [engine]);

  useEffect(() => () => engine.dispose(), [engine]);
  const dismissHistory = useCallback((id: number) => setHistory((items) => items.filter((item) => item.id !== id)), []);
  const clearHistory = useCallback(() => setHistory([]), []);
  return { activity: capsule?.message ?? null, capsule, history, dismissHistory, clearHistory, announce, announceSequence, setEnabledCategories, setMinimumPriority };
}
