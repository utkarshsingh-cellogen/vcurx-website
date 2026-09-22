/**
 * Single source of truth for the Domain Intelligence map.
 *
 * Everything else — the orbit on the home page, the mobile list, `/domains/[slug]`
 * and `/products/[slug]` — is generated from the two arrays below. To add a product,
 * append one object to `products`; no other file needs to change.
 */

export type ProductStatus = "live" | "beta" | "in-lab";

export type DomainSlug = "therapeutics" | "research" | "clinical" | "diagnostic";

export type Domain = {
  slug: DomainSlug;
  name: string;
  /** Used where the full name is too long, such as the journey nav. */
  shortName?: string;
  /** The named layer a domain's products sit under, e.g. "Bi-Sciterse". */
  subLayer?: string;
  /** Ordered — the first group renders on the left of a focused orbit, the second on the right. */
  groups: readonly string[];
  /** TODO: replace with real copy. */
  description: string;
  /** Design token from globals.css, without the `var()`. */
  accent: `--domain-${DomainSlug}`;
};

export type Product = {
  name: string;
  slug: string;
  domain: DomainSlug;
  group?: string;
  /** TODO: replace with real copy. */
  oneLiner: string;
  status: ProductStatus;
  /** TODO: replace with real copy. */
  problem?: string;
  /** TODO: replace with real copy. Exactly three steps. */
  steps?: readonly [string, string, string];
};

export const domains: readonly Domain[] = [
  {
    slug: "therapeutics",
    name: "Therapeutics Intelligence",
    shortName: "Therapeutics",
    groups: [],
    description: "TODO — what Therapeutics Intelligence covers and who it is for.",
    accent: "--domain-therapeutics",
  },
  {
    slug: "research",
    name: "Research",
    subLayer: "Bi-Sciterse",
    groups: ["Design", "Discovery"],
    description: "TODO — what Research covers and who it is for.",
    accent: "--domain-research",
  },
  {
    slug: "clinical",
    name: "Clinical",
    subLayer: "AI-Doctor",
    groups: ["Patient Care", "Regulatory"],
    description: "TODO — what Clinical covers and who it is for.",
    accent: "--domain-clinical",
  },
  {
    slug: "diagnostic",
    name: "Diagnostic",
    groups: [],
    description: "TODO — what Diagnostic covers and who it is for.",
    accent: "--domain-diagnostic",
  },
];

const TODO_LINE = "TODO — one line on what this does.";

export const products: readonly Product[] = [
  // Therapeutics Intelligence
  { name: "CAR-T AI Agent", slug: "car-t-ai-agent", domain: "therapeutics", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "GenAI PY Agent", slug: "genai-py-agent", domain: "therapeutics", oneLiner: TODO_LINE, status: "in-lab" },

  // Research › Bi-Sciterse › Design
  { name: "HelixForge", slug: "helixforge", domain: "research", group: "Design", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "PromoterForge", slug: "promoterforge", domain: "research", group: "Design", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "CelAbGen", slug: "celabgen", domain: "research", group: "Design", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "Cimmexa", slug: "cimmexa", domain: "research", group: "Design", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "Celnfo", slug: "celnfo", domain: "research", group: "Design", oneLiner: TODO_LINE, status: "in-lab" },

  // Research › Bi-Sciterse › Discovery
  { name: "Target Explorer", slug: "target-explorer", domain: "research", group: "Discovery", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "Antigen Discovery", slug: "antigen-discovery", domain: "research", group: "Discovery", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "Single-cell Analysis", slug: "single-cell-analysis", domain: "research", group: "Discovery", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "Spatiomic AI", slug: "spatiomic-ai", domain: "research", group: "Discovery", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "Virtual Cell", slug: "virtual-cell", domain: "research", group: "Discovery", oneLiner: TODO_LINE, status: "in-lab" },

  // Clinical › AI-Doctor › Patient Care
  { name: "Response Prediction", slug: "response-prediction", domain: "clinical", group: "Patient Care", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "Toxicity Prediction", slug: "toxicity-prediction", domain: "clinical", group: "Patient Care", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "Safety Monitoring", slug: "safety-monitoring", domain: "clinical", group: "Patient Care", oneLiner: TODO_LINE, status: "in-lab" },
  { name: "Perturbation Analysis", slug: "perturbation-analysis", domain: "clinical", group: "Patient Care", oneLiner: TODO_LINE, status: "in-lab" },

  // Clinical › AI-Doctor › Regulatory
  { name: "CiRA AI", slug: "cira-ai", domain: "clinical", group: "Regulatory", oneLiner: TODO_LINE, status: "in-lab" },

  // Diagnostic
  { name: "OralPatho", slug: "oralpatho", domain: "diagnostic", oneLiner: TODO_LINE, status: "in-lab" },
];

export const statusLabels: Record<ProductStatus, string> = {
  live: "Live",
  beta: "Beta",
  "in-lab": "In lab",
};

export function getDomain(slug: string): Domain | undefined {
  return domains.find((domain) => domain.slug === slug);
}

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function productsIn(domain: DomainSlug): readonly Product[] {
  return products.filter((product) => product.domain === domain);
}

/** A domain's products bucketed by group, in `domain.groups` order. Ungrouped domains yield one unnamed bucket. */
export function groupedProducts(domain: Domain): readonly { name?: string; products: readonly Product[] }[] {
  const owned = productsIn(domain.slug);
  if (domain.groups.length === 0) return [{ products: owned }];
  return domain.groups.map((name) => ({
    name,
    products: owned.filter((product) => product.group === name),
  }));
}

/**
 * Every domain and product has a portrait photo under `public/photos`, named after
 * its slug. Adding a product means adding `public/photos/<slug>.jpg` alongside it.
 */
export function photoFor(slug: string): string {
  return `/photos/${slug}.jpg`;
}
