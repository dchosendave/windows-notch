import { useEffect, useRef } from "react";

/** The value from the previous committed render; undefined on the first render. */
export function usePrevious<T>(value: T) {
  const previous = useRef<T | undefined>(undefined);
  useEffect(() => { previous.current = value; }, [value]);
  return previous.current;
}
