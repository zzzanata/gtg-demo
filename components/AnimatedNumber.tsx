"use client";

import { useEffect, useRef, useState } from "react";

const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const intFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

// Número que "sobe" de zero na primeira vez e, depois, desliza suavemente
// do valor anterior até o novo. Respeita quem pediu menos movimento.
export default function AnimatedNumber({
  value,
  kind = "int",
  duration = 1000,
}: {
  value: number;
  kind?: "int" | "brl";
  duration?: number;
}) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    let raf = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const origin = first.current ? 0 : from.current;
    const time = first.current ? duration : 380;
    first.current = false;

    if (reduce || origin === value) {
      raf = requestAnimationFrame(() => {
        from.current = value;
        setShown(value);
      });
      return () => cancelAnimationFrame(raf);
    }
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / time);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); // easeOutExpo
      const v = origin + (value - origin) * eased;
      from.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const text = kind === "brl" ? brlFmt.format(shown) : intFmt.format(Math.round(shown));
  return (
    <span className="tabular-nums" aria-label={kind === "brl" ? brlFmt.format(value) : intFmt.format(value)}>
      {text}
    </span>
  );
}
