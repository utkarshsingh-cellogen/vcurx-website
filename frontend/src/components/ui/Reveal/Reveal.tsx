"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./Reveal.module.css";

type RevealProps = {
  children: ReactNode;
  /** Delay in seconds, for staggering siblings. */
  delay?: number;
  className?: string;
};

/** Fades and lifts its content into place the first time it scrolls into view. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${shown ? styles.shown : ""} ${className ?? ""}`}
      style={{ "--delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}
