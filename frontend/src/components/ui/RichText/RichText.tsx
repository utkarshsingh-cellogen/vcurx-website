import type { RichText as RichTextValue } from "@/config/content";
import styles from "./RichText.module.css";

type RichTextProps = {
  value: RichTextValue;
  as?: "h2" | "h3" | "p";
  className?: string;
};

/** Heading-style text: plain runs are dimmed, `{ hl }` runs are bright, "\n" breaks the line. */
export function RichText({ value, as: Tag = "h2", className }: RichTextProps) {
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
