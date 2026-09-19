import type { CSSProperties } from "react";
import type { HeadlineSegment } from "@/config/site";
import { Sparkle } from "@/components/ui/Sparkle";
import styles from "./AnimatedHeadline.module.css";

type AnimatedHeadlineProps = {
  /** Each inner array is one line of the headline. */
  lines: readonly (readonly HeadlineSegment[])[];
  /** Index of the letter (across the whole headline) whose counter holds a ✦ sparkle. */
  sparkleIndex?: number;
  className?: string;
};

type Char = { char: string; index: number };
type Word = { key: string; chars: Char[] } | { key: string; space: true };
type Segment = { key: string; accent: boolean; bold: boolean; words: Word[] };

/**
 * Splits every line into words of per-character spans, with one stagger index
 * running across the whole headline so letters appear in reading order.
 */
function splitLines(lines: AnimatedHeadlineProps["lines"]): Segment[][] {
  let index = 0;
  return lines.map((line, li) =>
    line.map((segment, si) => ({
      key: `${li}-${si}`,
      accent: Boolean(segment.accent),
      bold: Boolean(segment.bold),
      words: segment.text
        .split(/(\s+)/)
        .filter(Boolean)
        .map((part, wi): Word => {
          const key = `${li}-${si}-${wi}`;
          if (/^\s+$/.test(part)) return { key, space: true };
          return { key, chars: [...part].map((char) => ({ char, index: index++ })) };
        }),
    })),
  );
}

/**
 * Serif headline whose letters rise out of a blur one by one.
 * Accent segments render in italic with a moving light shimmer.
 */
export function AnimatedHeadline({ lines, sparkleIndex, className }: AnimatedHeadlineProps) {
  const label = lines.map((line) => line.map((s) => s.text).join("")).join(" ");
  const split = splitLines(lines);

  return (
    <h1 className={`${styles.headline} ${className ?? ""}`} aria-label={label}>
      {split.map((line, li) => (
        <span key={li} className={styles.line} aria-hidden="true">
          {line.map((segment) => {
            const content = segment.words.map((word) =>
              "space" in word ? (
                " "
              ) : (
                <span key={word.key} className={styles.word}>
                  {word.chars.map(({ char, index }) => (
                    <span
                      key={index}
                      className={styles.char}
                      style={{ "--i": index } as CSSProperties}
                    >
                      {char}
                      {index === sparkleIndex && <Sparkle className={styles.sparkle} />}
                    </span>
                  ))}
                </span>
              ),
            );

            if (segment.accent) {
              return (
                <em key={segment.key} className={styles.accent}>
                  {content}
                </em>
              );
            }
            return (
              <span key={segment.key} className={`${styles.lit} ${segment.bold ? styles.bold : ""}`}>
                {content}
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
