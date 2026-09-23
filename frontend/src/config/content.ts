/** Copy for the sections below the hero. */

/** Text with optional emphasised runs: plain strings render dimmed, `{ hl }` renders bright. */
export type RichText = readonly (string | { hl: string })[];

export const toEarth = {
  id: "switch-earth",
  title: ["Let's explore the ", { hl: "world of Healthcare" }, " and discover more from this journey!"] as RichText,
  body: "From the frontier of discovery to the place it matters most — us.",
  cta: { label: "Continue exploring", href: "/domains" },
};

export const domainsSection = {
  id: "domains",
  title: "Our Domain Intelligence",
};

export const toNext = {
  id: "switch-next",
  title: ["Let's look ", { hl: "further" }, " and see what comes next!"] as RichText,
  body: "The next chapter of VcurX is being written in our labs right now.",
  cta: { label: "Back to the start", href: "#top" },
};
