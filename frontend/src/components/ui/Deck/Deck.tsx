"use client";

import { useState } from "react";
import { DeckCard, type DeckCardProps } from "@/components/ui/DeckCard";
import styles from "./Deck.module.css";

/** One card's own content; the deck supplies everything about its position. */
export type DeckItem = Omit<DeckCardProps, "state" | "direction" | "tilt" | "restY"> & {
  key: string;
};

/** Repeated down the row so a deck of any length still looks hand-laid. */
const TILTS = [-2.6, 1.4, -1.2, 2.6, -1.9, 2.1];
const REST_Y = [8, -6, 6, -9, 5, -7];

type DeckProps = {
  /** `fan` overlaps and tilts the cards like a hand-laid deck; `grid` sets them square in rows. */
  layout?: "fan" | "grid";
  /** What happens below 1024px: lay the cards out flat, or step aside entirely. */
  narrow?: "grid" | "hide";
  items: readonly DeckItem[];
  className?: string;
};

/**
 * A fanned row of cards. Pointing at or tabbing to one raises it to the front at full
 * size while its neighbours shrink, dim and lean out of the way — so there is always
 * exactly one live card, the way the reference deck reads. The `grid` layout keeps the
 * raise and the dimming, but nothing leans or slides, so the cards stay in line.
 */
export function Deck({ items, layout = "fan", narrow = "grid", className }: DeckProps) {
  const [active, setActive] = useState<number | null>(null);
  const fan = layout === "fan";

  return (
    <div
      className={`${styles.deck} ${className ?? ""}`}
      data-layout={layout}
      data-narrow={narrow}
      onPointerLeave={() => setActive(null)}
    >
      {items.map(({ key, ...card }, i) => (
        <DeckCard
          key={key}
          {...card}
          state={active === null ? "idle" : i === active ? "active" : "recede"}
          direction={!fan || active === null || i === active ? 0 : i < active ? -1 : 1}
          tilt={fan ? TILTS[i % TILTS.length] : 0}
          restY={fan ? REST_Y[i % REST_Y.length] : 0}
          onPointerEnter={() => setActive(i)}
          onFocus={() => setActive(i)}
          onBlur={() => setActive(null)}
        />
      ))}
    </div>
  );
}
