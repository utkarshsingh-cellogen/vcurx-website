"use client";

import { useEffect, useRef } from "react";
import styles from "./ScrollHoverPause.module.css";

/**
 * How long after the last scroll event pointing comes back, in ms. Long enough to span
 * the gaps a scroll really has: the pause between two notches of a mouse wheel, each of
 * which is its own short smooth scroll, and a slow frame on a slow device. A shorter
 * wait let hover back in mid-scroll there, and its restyling made the next frames slower
 * still. `scrollend` is no better a signal: it fires after every wheel notch.
 */
const SETTLE_MS = 300;

/**
 * An invisible sheet over the page that catches the pointer while the page scrolls, so
 * nothing under it is hovered for the length of a scroll. Cards slide under a resting
 * pointer as the page moves, and each one it crossed would raise its sheet, light its
 * branch and dim the other domains, restyling and repainting large parts of the page on
 * every frame. Measured with a pointer over the domains, that halved the frame rate.
 *
 * It is one element switched on and off by its own inline style, rather than a flag on
 * the document: `pointer-events` is inherited, so a flag on an ancestor restyles the
 * whole page each time it flips, which cost more than the hover it saved on slow devices.
 * Wheel and touch scrolling pass straight through it to the page.
 */
export function ScrollHoverPause() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cover = ref.current;
    if (!cover) return;
    let timer = 0;
    const release = () => {
      timer = 0;
      cover.style.pointerEvents = "";
    };
    const onScroll = () => {
      if (timer) window.clearTimeout(timer);
      else cover.style.pointerEvents = "auto";
      timer = window.setTimeout(release, SETTLE_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  return <div ref={ref} className={styles.cover} aria-hidden="true" />;
}
