/**
 * Light, dark, or the sky outside.
 *
 * The visitor picks a preference, kept in localStorage: `light`, `dark` or `auto`.
 * `auto` follows the visitor's own clock through four skies: night, dawn, day and dusk.
 * Only day is light; dawn and dusk keep the dark interface and change the sky behind
 * it, so text keeps its contrast at every hour. No location is asked for: the hours
 * are fixed, and near enough for a sky.
 *
 * The result is written onto <html> as three attributes the stylesheets and the globe
 * read: `data-pref` (what was chosen), `data-sky` (night | dawn | day | dusk) and
 * `data-mode` (light | dark).
 */

export type ThemePreference = "auto" | "light" | "dark";
export type Sky = "night" | "dawn" | "day" | "dusk";

export const THEME_STORAGE_KEY = "vcurx-theme";

/**
 * Works out the theme and writes it onto <html>. Self-contained on purpose: it is also
 * inlined into <head> as source (see the root layout), so it runs before the first
 * frame and a light page never flashes dark. It may use nothing from outside itself.
 *
 * `?sky=dawn` (or night, day, dusk) in the address previews any sky whatever the
 * preference or the hour.
 *
 * With `write` false it only works the theme out and returns it, so a caller can tell
 * whether anything would change before it does.
 */
export function applyTheme(write = true) {
  const root = document.documentElement;
  let pref = "auto";
  try {
    pref = localStorage.getItem("vcurx-theme") || "auto";
  } catch {
    // Storage can be blocked; the default stands.
  }
  if (pref !== "light" && pref !== "dark") pref = "auto";

  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  let sky =
    hour >= 5 && hour < 7 ? "dawn"
      : hour >= 7 && hour < 17.5 ? "day"
        : hour >= 17.5 && hour < 20 ? "dusk"
          : "night";
  if (pref === "light") sky = "day";
  if (pref === "dark") sky = "night";

  const preview = new URLSearchParams(location.search).get("sky");
  if (preview === "night" || preview === "dawn" || preview === "day" || preview === "dusk") sky = preview;

  const mode = sky === "day" ? "light" : "dark";
  if (write) {
    root.setAttribute("data-pref", pref);
    root.setAttribute("data-sky", sky);
    root.setAttribute("data-mode", mode);
  }
  return { pref, sky, mode };
}

/** The source of `applyTheme` as a script that runs it, for the root layout's <head>. */
export const THEME_BOOT_SCRIPT = `(${applyTheme.toString()})();`;
