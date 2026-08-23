import { AnimatePresence, motion } from "motion/react";

export function RollingText({ value, className }: { value: string; className?: string }) {
  return <span className={className} aria-label={value}>{value.split("").map((character, index) => <span className="rolling-slot" key={index}><AnimatePresence initial={false} mode="popLayout"><motion.span aria-hidden="true" key={`${index}-${character}`} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.16 }}>{character === " " ? "\u00a0" : character}</motion.span></AnimatePresence></span>)}</span>;
}
