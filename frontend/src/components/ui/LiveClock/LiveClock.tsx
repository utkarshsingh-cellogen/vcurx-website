"use client";

import { useSyncExternalStore } from "react";

type LiveClockProps = {
  /** "local" = the visitor's time zone; any IANA zone otherwise (e.g. "UTC"). */
  timeZone?: "local" | string;
  className?: string;
};

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}

/** A ticking HH : MM : SS clock. Renders a stable placeholder on the server to avoid hydration mismatch. */
export function LiveClock({ timeZone = "local", className }: LiveClockProps) {
  const time = useSyncExternalStore(
    subscribe,
    () => format(new Date(), timeZone),
    () => "-- : -- : --",
  );
  return (
    <time className={className} suppressHydrationWarning>
      {time}
    </time>
  );
}

function format(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    ...(timeZone === "local" ? {} : { timeZone }),
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "--";
  return `${get("hour")} : ${get("minute")} : ${get("second")}`;
}
