import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, FocusEventHandler, PointerEventHandler } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./DeckCard.module.css";

export type DeckCardProps = {
  /** Portrait photo filling the card. */
  image: string;
  name: string;
  href: string;
  cta?: string;
  /** A `--domain-*` custom property name, without `var()`. */
  accent?: string;
  /** Widths this card renders at, for the image srcset. */
  sizes?: string;
  priority?: boolean;
  size?: "deck" | "hero";
  /** Which way this card leans away from the raised one: -1 left, 0 none, 1 right. */
  direction?: -1 | 0 | 1;
  /** Degrees of rest tilt and pixels of rest offset, so a deck can lie hand-laid. */
  tilt?: number;
  restY?: number;
  state?: "idle" | "active" | "recede";
  onPointerEnter?: PointerEventHandler<HTMLElement>;
  onFocus?: FocusEventHandler<HTMLElement>;
  onBlur?: FocusEventHandler<HTMLElement>;
};

/**
 * The card the whole site is built from: a name over a portrait image, and a
 * smoked bar at the foot carrying nothing but the call to action.
 * It only dresses the state it is handed — a Deck decides which card is raised.
 */
export function DeckCard({
  image,
  name,
  href,
  cta = "Explore",
  accent,
  sizes = "280px",
  priority = false,
  size = "deck",
  direction = 0,
  tilt = 0,
  restY = 0,
  state = "idle",
  onPointerEnter,
  onFocus,
  onBlur,
}: DeckCardProps) {
  return (
    <article
      className={styles.card}
      data-state={state}
      data-size={size}
      style={
        {
          "--domain": accent ? `var(${accent})` : "var(--accent)",
          "--dir": direction,
          "--tilt": `${tilt}deg`,
          "--rest-y": `${restY}px`,
        } as CSSProperties
      }
      onPointerEnter={onPointerEnter}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <Image
        src={image}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className={styles.art}
      />
      <span className={styles.scrim} aria-hidden="true" />

      <header className={styles.head}>
        <h3 className={styles.name}>{name}</h3>
      </header>

      <footer className={styles.foot}>
        <Link href={href} className={styles.cta}>
          {cta}
          <span className={styles.ctaLabel}> {name}</span>
          <Icon name="arrowUpRight" size={13} className={styles.ctaIcon} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}
