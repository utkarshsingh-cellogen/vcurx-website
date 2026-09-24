import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, FocusEventHandler, PointerEventHandler } from "react";
import type { CardLogo } from "@/data/products";
import { Icon } from "@/components/ui/Icon";
import styles from "./DeckCard.module.css";

export type DeckCardProps = {
  /** Portrait photo filling the card. */
  image: string;
  /** The product's own logo. When given, it replaces the photo, set on a plate of its own ground. */
  logo?: CardLogo;
  name: string;
  /** Where the call to action goes. Without one the card says its link is on the way. */
  href?: string;
  /** The link leaves the site, so it opens in a new tab. */
  external?: boolean;
  /** A line or two on the card's subject, on a sheet that rises over it while it is raised. */
  description?: string;
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
 * smoked bar at the foot carrying nothing but the call to action. A product with a
 * logo shows the logo instead, whole and centred on a plate, and drops the name
 * when the logo already spells it. A card with a description raises a paper sheet over
 * itself while it is the raised card, with its name and that description on it.
 * It only dresses the state it is handed — a Deck decides which card is raised.
 */
export function DeckCard({
  image,
  logo,
  name,
  href,
  external = false,
  description,
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
      data-plate={logo?.plate}
      data-named={logo?.named || undefined}
      data-described={description ? "" : undefined}
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
      {logo ? (
        <span className={styles.plate}>
          {/* Logos carry fine type and hard edges, so they are served above the default quality. */}
          <Image src={logo.src} alt="" fill sizes={sizes} priority={priority} quality={90} className={styles.logo} />
        </span>
      ) : (
        <>
          <Image src={image} alt="" fill sizes={sizes} priority={priority} className={styles.art} />
          <span className={styles.scrim} aria-hidden="true" />
        </>
      )}

      <header className={`${styles.head} ${logo?.named ? styles.hiddenName : ""}`}>
        <h3 className={styles.name}>{name}</h3>
      </header>

      {description && (
        <div className={styles.sheet}>
          {/* The heading above already names the card for screen readers. */}
          <p className={styles.sheetName} aria-hidden="true">{name}</p>
          <p className={styles.sheetText}>{description}</p>
        </div>
      )}

      <footer className={styles.foot}>
        {!href ? (
          <span className={`${styles.cta} ${styles.ctaPending}`}>Link coming soon</span>
        ) : external ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={styles.cta}>
            {cta}
            <span className={styles.ctaLabel}> {name} (opens in a new tab)</span>
            <Icon name="arrowUpRight" size={13} className={styles.ctaIcon} aria-hidden="true" />
          </a>
        ) : (
          <Link href={href} className={styles.cta}>
            {cta}
            <span className={styles.ctaLabel}> {name}</span>
            <Icon name="arrowUpRight" size={13} className={styles.ctaIcon} aria-hidden="true" />
          </Link>
        )}
      </footer>
    </article>
  );
}
