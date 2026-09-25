"use client";

import { useEffect, useState } from "react";
import { applyTheme, THEME_STORAGE_KEY, type Sky, type ThemePreference } from "@/lib/theme";
import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "./ThemeToggle.module.css";

const OPTIONS: readonly { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "auto", label: "Auto", icon: "auto" },
];

const SKY_NAMES: Record<Sky, string> = { night: "night", dawn: "dawn", day: "day", dusk: "dusk" };

type ViewTransition = { ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void> };

/**
 * Re-reads the theme, crossfading the whole page where the browser can. Only when the
 * theme actually changes: the minute check in Auto would otherwise start a full-page
 * transition every minute for nothing. A hidden tab, or reduced motion, just switches;
 * a transition in a hidden tab is aborted, and its promises reject, which is why each
 * one's rejection is caught.
 */
function switchTheme() {
  const root = document.documentElement;
  const next = applyTheme(false);
  if (next.pref === root.getAttribute("data-pref") && next.sky === root.getAttribute("data-sky")) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = (document as Document & { startViewTransition?: (update: () => void) => ViewTransition }).startViewTransition;
  if (!start || reduced || document.hidden) {
    applyTheme();
    return;
  }
  const transition = start.call(document, () => applyTheme());
  const ignore = () => {};
  transition.ready.catch(ignore);
  transition.finished.catch(ignore);
  transition.updateCallbackDone.catch(ignore);
}

/**
 * Light, Dark or Auto, fixed in the top corner of every page. Auto follows the
 * visitor's clock (see lib/theme.ts) and is checked again each minute, so a page left
 * open through sunset turns with it.
 */
export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>("auto");
  const [sky, setSky] = useState<Sky>("night");

  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      setPref((root.getAttribute("data-pref") as ThemePreference) ?? "auto");
      setSky((root.getAttribute("data-sky") as Sky) ?? "night");
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-pref", "data-sky"] });
    const tick = window.setInterval(() => {
      if (root.getAttribute("data-pref") === "auto") switchTheme();
    }, 60_000);
    return () => {
      observer.disconnect();
      window.clearInterval(tick);
    };
  }, []);

  const choose = (value: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Without storage the choice lasts for this page only.
    }
    switchTheme();
  };

  return (
    <div className={styles.toggle} role="radiogroup" aria-label="Colour theme">
      {OPTIONS.map((option) => {
        const checked = pref === option.value;
        const title = option.value === "auto" ? `Auto: follows the time of day (now ${SKY_NAMES[sky]})` : option.label;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={title}
            title={title}
            className={styles.option}
            onClick={() => choose(option.value)}
          >
            <Icon name={option.icon} size={16} />
            <span className={styles.label}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
