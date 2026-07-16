"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Types out console lines one character at a time once scrolled into view. */
export function TypingConsole({
  lines,
  className,
  charDelay = 10,
  lineDelay = 220,
}: {
  lines: string[];
  className?: string;
  charDelay?: number;
  lineDelay?: number;
}) {
  const ref = useRef<HTMLPreElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setShown(lines);
      setDone(true);
      return;
    }
    let line = 0;
    let char = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (line >= lines.length) {
        setDone(true);
        return;
      }
      char++;
      const next = lines.slice(0, line);
      next.push(lines[line].slice(0, char));
      setShown(next);
      if (char >= lines[line].length) {
        line++;
        char = 0;
        timer = setTimeout(tick, lineDelay);
      } else {
        timer = setTimeout(tick, charDelay);
      }
    };
    timer = setTimeout(tick, 300);
    return () => clearTimeout(timer);
  }, [inView, lines, reduce, charDelay, lineDelay]);

  return (
    <pre ref={ref} className={cn("whitespace-pre-wrap", className)}>
      {shown.join("\n")}
      {!done && <span className="animate-pulse text-white">▋</span>}
    </pre>
  );
}
