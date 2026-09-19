"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

/** Tracks the user's OS-level "reduce motion" preference. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
