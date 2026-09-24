import type { ReactNode } from "react";

type ProductLinkProps = {
  /** The product's own site, from `Product.url`. */
  href?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Every link to a product goes to the product's own site, in a new tab; the site has
 * no product pages of its own to open. Until a product's site is set, the same content
 * stands in the same place as plain text, so lists keep their shape.
 */
export function ProductLink({ href, className, children }: ProductLinkProps) {
  if (!href) {
    return (
      <span className={className} data-pending="">
        {children}
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
