import type { Transition, Variants } from "motion/react";

export const motionTokens = {
  distance: { micro: 2, small: 6, medium: 10 },
  spring: {
    responsive: { type: "spring", stiffness: 520, damping: 38, mass: 0.75 } satisfies Transition,
    gentle: { type: "spring", stiffness: 320, damping: 34, mass: 0.9 } satisfies Transition,
  },
  press: { hover: 1.025, tap: 0.96 },
} as const;

export const viewVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * motionTokens.distance.medium }),
  center: { opacity: 1, x: 0, transitionEnd: { transform: "none" } },
  exit: (direction: number) => ({ opacity: 0, x: direction * -motionTokens.distance.small }),
};
