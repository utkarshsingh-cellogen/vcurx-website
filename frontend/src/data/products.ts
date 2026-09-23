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
  /** A line or two on what the domain covers. Omitted until the copy exists. */
  description?: string;
  /** Design token from globals.css, without the `var()`. */
  accent: `--domain-${DomainSlug}`;
};

export type Product = {
  name: string;
  slug: string;
  domain: DomainSlug;
  group?: string;
  /** One line on what the product does. Omitted until the copy exists. */
  oneLiner?: string;
  status: ProductStatus;
  /** The problem it exists to solve. */
  problem?: string;
  /** Exactly three steps, or none at all. */
  steps?: readonly [string, string, string];
  /** The product's own logo, at `public/logos/<slug>.webp`. Cards show it in place of the photo. */
  logo?: LogoInfo;
};

export type LogoInfo = {
  /** The ground the logo was drawn for: nearly all are dark ink for a light page. */
  plate: "light" | "dark";
  /** Whether the logo spells out the product's name, so the card need not repeat it. */
  named: boolean;
};

/** A logo ready for a card: where it is, and how it wants to be shown. */
export type CardLogo = LogoInfo & { src: string };

export const domains: readonly Domain[] = [
  {
    slug: "therapeutics",
    name: "Therapeutics Intelligence",
    shortName: "Therapeutics",
    groups: [],
    accent: "--domain-therapeutics",
  },
  {
    slug: "research",
    name: "Research",
    subLayer: "Bi-Sciterse",
    groups: ["Design", "Discovery"],
    accent: "--domain-research",
  },
  {
    slug: "clinical",
    name: "Clinical",
    subLayer: "AI-Doctor",
    groups: ["Patient Care", "Regulatory"],
    accent: "--domain-clinical",
  },
  {
    slug: "diagnostic",
    name: "Diagnostic",
    groups: [],
    accent: "--domain-diagnostic",
  },
];


export const products: readonly Product[] = [
  // Therapeutics Intelligence
  { name: "CAR-T AI Agent", slug: "car-t-ai-agent", domain: "therapeutics", status: "in-lab", logo: { plate: "light", named: true } },
  { name: "GenAI PY Agent", slug: "genai-py-agent", domain: "therapeutics", status: "in-lab" },

  // Research › Bi-Sciterse › Design
  { name: "HelixForge", slug: "helixforge", domain: "research", group: "Design", status: "in-lab", logo: { plate: "light", named: true } },
  { name: "PromoterForge", slug: "promoterforge", domain: "research", group: "Design", status: "in-lab", logo: { plate: "dark", named: true } },
  { name: "CelAbGen", slug: "celabgen", domain: "research", group: "Design", status: "in-lab", logo: { plate: "light", named: true } },
  { name: "Cimmexa", slug: "cimmexa", domain: "research", group: "Design", status: "in-lab", logo: { plate: "light", named: true } },
  { name: "Celnfo", slug: "celnfo", domain: "research", group: "Design", status: "in-lab" },

  // Research › Bi-Sciterse › Discovery
  { name: "Target Explorer", slug: "target-explorer", domain: "research", group: "Discovery", status: "in-lab" },
  { name: "Antigen Discovery", slug: "antigen-discovery", domain: "research", group: "Discovery", status: "in-lab" },
  { name: "Single-cell Analysis", slug: "single-cell-analysis", domain: "research", group: "Discovery", status: "in-lab" },
  { name: "Spatiomic AI", slug: "spatiomic-ai", domain: "research", group: "Discovery", status: "in-lab", logo: { plate: "light", named: false } },
  { name: "Virtual Cell", slug: "virtual-cell", domain: "research", group: "Discovery", status: "in-lab", logo: { plate: "light", named: false } }, // The logo reads "CytoTwin", so the card keeps the product's name.

  // Clinical › AI-Doctor › Patient Care
  { name: "Response Prediction", slug: "response-prediction", domain: "clinical", group: "Patient Care", status: "in-lab", logo: { plate: "light", named: false } },
  { name: "Toxicity Prediction", slug: "toxicity-prediction", domain: "clinical", group: "Patient Care", status: "in-lab", logo: { plate: "light", named: false } },
  { name: "Safety Monitoring", slug: "safety-monitoring", domain: "clinical", group: "Patient Care", status: "in-lab", logo: { plate: "light", named: false } },
  { name: "Perturbation Analysis", slug: "perturbation-analysis", domain: "clinical", group: "Patient Care", status: "in-lab", logo: { plate: "light", named: false } },

  // Clinical › AI-Doctor › Regulatory
  { name: "CiRA AI", slug: "cira-ai", domain: "clinical", group: "Regulatory", status: "in-lab", logo: { plate: "light", named: true } },

  // Diagnostic
  { name: "OralPatho", slug: "oralpatho", domain: "diagnostic", status: "in-lab", logo: { plate: "light", named: false } },
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

/** A product's logo, ready for a card, or undefined while it has only a photograph. */
export function logoFor(product: Product): CardLogo | undefined {
  return product.logo && { ...product.logo, src: `/logos/${product.slug}.webp` };
}
