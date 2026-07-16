"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/** Counts a number up from 0 the first time it scrolls into view. */
export function CountUp({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
  duration = 1.4,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const raw = useMotionValue(0);
  const spring = useSpring(raw, { duration: duration * 1000, bounce: 0 });

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      raw.jump(value);
      spring.jump(value);
    } else {
      raw.set(value);
    }
  }, [inView, value, reduce, raw, spring]);

  useEffect(() => {
    const render = (v: number) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${v.toFixed(decimals)}${suffix}`;
      }
    };
    render(spring.get());
    return spring.on("change", render);
  }, [spring, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {(0).toFixed(decimals)}
      {suffix}
    </span>
  );
}
