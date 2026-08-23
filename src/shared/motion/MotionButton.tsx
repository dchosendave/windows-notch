import { motion, type HTMLMotionProps } from "motion/react";
import { motionTokens } from "./tokens";

export function MotionButton(props: HTMLMotionProps<"button">) {
  return <motion.button whileHover={props.disabled ? undefined : { scale: motionTokens.press.hover }} whileTap={props.disabled ? undefined : { scale: motionTokens.press.tap }} transition={motionTokens.spring.responsive} {...props} />;
}
