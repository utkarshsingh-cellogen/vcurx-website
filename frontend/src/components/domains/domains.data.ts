import { domains, groupedProducts, type DomainSlug } from "@/data/products";
import type { PlanetKind } from "./planetTextures";

/**
 * What the solar system adds to a domain: which real planet its surface is modelled
 * on, its accent, and a line of copy. Everything else — names, sub-brands, products
 * and their grouping — comes from data/products.ts, so the orbit never lists a
 * product the site does not have.
 */
const SOLAR: Record<DomainSlug, { kind: PlanetKind; color: string; desc: string }> = {
  therapeutics: {
    kind: "earth",
    color: "#6fb4c4",
    desc: "AI agents built around cell and gene therapy programs.",
  },
  research: {
    kind: "ice",
    color: "#8f96e4",
    desc: "Design and discovery models for antibodies, nanobodies, promoters, targets and cells.",
  },
  clinical: {
    kind: "ringed",
    color: "#d9bd84",
    desc: "Prediction, monitoring and regulatory tools for trials and patient care.",
  },
  diagnostic: {
    kind: "mars",
    color: "#d4805f",
    desc: "Pathology AI for faster, more consistent diagnosis.",
  },
};

export type SolarDomain = {
  id: DomainSlug;
  name: string;
  kind: PlanetKind;
  color: string;
  desc: string;
  brand?: string;
  groups: readonly { title: string | null; items: readonly { name: string; slug: string }[] }[];
  count: number;
};

/** In orbit order, innermost first — the same order as `domains`. */
export const DOMAINS: readonly SolarDomain[] = domains.map((domain) => {
  const groups = groupedProducts(domain).map((group) => ({
    title: group.name ?? null,
    items: group.products.map((product) => ({ name: product.name, slug: product.slug })),
  }));
  return {
    id: domain.slug,
    name: domain.shortName ?? domain.name,
    ...SOLAR[domain.slug],
    brand: domain.subLayer,
    groups,
    count: groups.reduce((n, group) => n + group.items.length, 0),
  };
});
