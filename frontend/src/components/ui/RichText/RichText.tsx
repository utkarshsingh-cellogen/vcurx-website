"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { TEXT_LINE_STAGGER } from "@/lib/revealSequence";
import type { RichText as RichTextValue } from "@/config/content";
import styles from "./RichText.module.css";

type RichTextProps = {
  value: RichTextValue;
  as?: "h2" | "h3" | "p";
  className?: string;
  /** Reveal each rendered line together, including after responsive wrapping. */
  reveal?: boolean;
  delay?: number;
  /** Supplied by a shared sequence; omit to reveal independently on intersection. */
  play?: boolean;
  onLineCount?: (count: number) => void;
};

/** Heading-style text: plain runs are dimmed, `{ hl }` runs are bright, "\n" breaks the line. */
export function RichText({ value, as: Tag = "h2", className, reveal = false, delay = 0, play, onLineCount }: RichTextProps) {
  const ref = useRef<HTMLHeadingElement & HTMLParagraphElement>(null);
  const [shown, setShown] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!reveal || !element) return;
    let disposed = false;
    const measureLines = () => {
      if (disposed) return;
      if (!element.getClientRects().length) return;
      let line = -1;
      let previousTop = -Infinity;
      const words = element.querySelectorAll<HTMLElement>("[data-line-word]");
      // offsetTop ignores the entrance transform, so it measures the actual text lines.
      const tops = Array.from(words, (word) => word.offsetTop);
      words.forEach((word, index) => {
        if (Math.abs(tops[index] - previousTop) > 2) {
          line++;
          previousTop = tops[index];
        }
        word.style.setProperty("--line", String(line));
      });
      onLineCount?.(Math.max(1, line + 1));
    };
    measureLines();
    void document.fonts.ready.then(measureLines);
    const resize = new ResizeObserver(measureLines);
    resize.observe(element);
    const observer = play === undefined ? new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.2) {
        setShown(false);
        return;
      }
      measureLines();
      setShown(true);
    }, { threshold: [0, 0.2], rootMargin: "0px 0px -8% 0px" }) : null;
    observer?.observe(element);
    return () => {
      disposed = true;
      observer?.disconnect();
      resize.disconnect();
    };
  }, [reveal, value, play, onLineCount]);

  const label = value.map((part) => typeof part === "string" ? part : part.hl).join("");

  if (reveal) {
    return (
      <Tag ref={ref} className={`${styles.text} ${styles.lineReveal} ${(play ?? shown) ? styles.shown : ""} ${className ?? ""}`}
        style={{ "--text-delay": `${delay}s`, "--line-stagger": `${TEXT_LINE_STAGGER}s` } as CSSProperties}>
        <span className={styles.accessibleText}>{label}</span>
        {value.map((part, index) => {
          const text = typeof part === "string" ? part : part.hl;
          if (text === "\n") return <br key={index} aria-hidden="true" />;
          return (
            <span key={index} aria-hidden="true" className={typeof part === "string" ? undefined : styles.hl}>
              {text.split(/(\s+)/).filter(Boolean).map((word, wordIndex) => /^\s+$/.test(word) ? word : (
                <span key={wordIndex} data-line-word className={styles.word}>{word}</span>
              ))}
            </span>
          );
        })}
      </Tag>
    );
  }

  return (
    <Tag className={`${styles.text} ${className ?? ""}`}>
      {value.map((part, i) =>
        typeof part === "string" ? (
          part === "\n" ? (
            <br key={i} />
          ) : (
            <span key={i}>{part}</span>
          )
        ) : (
          <span key={i} className={styles.hl}>
            {part.hl}
          </span>
        ),
      )}
    </Tag>
  );
}
