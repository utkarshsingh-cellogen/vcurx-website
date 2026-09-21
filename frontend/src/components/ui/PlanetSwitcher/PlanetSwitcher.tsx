import Link from "next/link";
import type { CSSProperties } from "react";
import { sections, type SectionId } from "@/config/content";
import { Icon } from "@/components/ui/Icon";
import styles from "./PlanetSwitcher.module.css";

type PlanetSwitcherProps = {
  active: SectionId;
  className?: string;
  reveal?: boolean;
  playing?: boolean;
  delay?: number;
};

/** Pill of domains with the active one centred; arrows step to the neighbouring domain. */
export function PlanetSwitcher({ active, className, reveal = false, playing = false, delay = 0 }: PlanetSwitcherProps) {
  const index = sections.findIndex((section) => section.id === active);
  const prev = sections[index - 1];
  const next = sections[index + 1];
  // Show the active domain flanked by its neighbours; the rest fade out past the edges
  const visible = [prev, sections[index], next];

  return (
    <nav className={`${styles.switcher} ${reveal ? styles.reveal : ""} ${playing ? styles.playing : ""} ${className ?? ""}`}
      style={{ "--selector-delay": `${delay}s` } as CSSProperties} aria-label="Domains">
      <Arrow section={prev} direction="prev" />
      <ul className={styles.pill}>
        {visible.map((section, i) =>
          section ? (
            <li key={section.id}>
              {section.href ? (
                <Link
                  href={section.href}
                  className={`${styles.item} ${i === 1 ? styles.active : ""}`}
                  aria-current={i === 1 ? "true" : undefined}
                >
                  {i === 1 && <Icon name="planet" size={16} />}
                  <span className={styles.itemLabel}>{section.name}</span>
                </Link>
              ) : (
                <span className={`${styles.item} ${styles.soon}`} title="Coming soon">
                  <span className={styles.itemLabel}>{section.name}</span>
                </span>
              )}
            </li>
          ) : (
            <li key={`empty-${i}`} className={styles.item} aria-hidden="true" />
          ),
        )}
      </ul>
      <Arrow section={next} direction="next" />
    </nav>
  );
}

function Arrow({
  section,
  direction,
}: {
  section?: (typeof sections)[number];
  direction: "prev" | "next";
}) {
  const icon = direction === "prev" ? "chevronLeft" : "chevronRight";
  if (!section?.href) {
    return (
      <span className={`${styles.arrow} ${styles.disabled}`} aria-hidden="true">
        <Icon name={icon} size={14} />
      </span>
    );
  }
  return (
    <Link href={section.href} className={styles.arrow} aria-label={`Go to ${section.name}`}>
      <Icon name={icon} size={14} />
    </Link>
  );
}
