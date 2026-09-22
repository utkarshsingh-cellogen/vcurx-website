import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { domains, products } from "@/data/products";

/** Every route is generated from `products.ts`, so the sitemap is too. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;

  return [
    { url: base, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/domains`, changeFrequency: "monthly", priority: 0.8 },
    ...domains.map((domain) => ({
      url: `${base}/domains/${domain.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...products.map((product) => ({
      url: `${base}/products/${product.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
