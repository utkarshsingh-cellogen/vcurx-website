/** Copy for the sections below the hero. */

/** Text with optional emphasised runs: plain strings render dimmed, `{ hl }` renders bright. */
export type RichText = readonly (string | { hl: string })[];

export type PlanetId = "mars" | "earth" | "jupiter";

export const planets: readonly { id: PlanetId; name: string; href?: string }[] = [
  { id: "mars", name: "Mars", href: "#top" },
  { id: "earth", name: "Earth", href: "#home" },
  { id: "jupiter", name: "Jupiter" }, // no section yet — shown as "coming soon"
];

export const toEarth = {
  id: "switch-earth",
  title: ["Let's switch to another ", { hl: "world of Healthcare" }, " and discover more from this journey!"] as RichText,
  body: "From the frontier of discovery to the place it matters most — us.",
  cta: { label: "Go to Earth!", href: "#home" },
  active: "mars" as PlanetId,
};

export const home = {
  id: "home",
};

export const toNext = {
  id: "switch-next",
  title: ["Let's look ", { hl: "further" }, " and see what comes next!"] as RichText,
  body: "The next chapter of Vcurx is being written in our labs right now.",
  cta: { label: "Back to the start", href: "#top" },
  active: "earth" as PlanetId,
};
