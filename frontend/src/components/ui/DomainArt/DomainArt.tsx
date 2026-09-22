import type { ReactNode } from "react";
import type { DomainSlug } from "@/data/products";

const W = 250;
const H = 360;

/** Rungs of a double helix: two mirrored strands sampled down the card. */
function helixRungs() {
  const rungs = [];
  for (let i = 0; i <= 16; i += 1) {
    const t = i / 16;
    const y = 24 + t * (H - 48);
    const offset = Math.sin(t * Math.PI * 3.1) * 52;
    rungs.push({ y, x1: W / 2 + offset, x2: W / 2 - offset, key: i });
  }
  return rungs;
}

/** One strand of the same helix, as a smooth polyline. */
function helixStrand(sign: 1 | -1) {
  const points = [];
  for (let i = 0; i <= 64; i += 1) {
    const t = i / 64;
    const y = 24 + t * (H - 48);
    const x = W / 2 + sign * Math.sin(t * Math.PI * 3.1) * 52;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

const motifs: Record<DomainSlug, ReactNode> = {
  // Double helix — sequence design and discovery.
  research: (
    <g fill="none" stroke="var(--domain)" strokeLinecap="round">
      <g opacity="0.24" strokeWidth="1">
        {helixRungs().map((rung) => (
          <line key={rung.key} x1={rung.x1} y1={rung.y} x2={rung.x2} y2={rung.y} />
        ))}
      </g>
      <polyline points={helixStrand(1)} strokeWidth="1.6" opacity="0.62" />
      <polyline points={helixStrand(-1)} strokeWidth="1.6" opacity="0.38" />
      <g fill="var(--domain)" stroke="none" opacity="0.5">
        {helixRungs()
          .filter((_, i) => i % 3 === 0)
          .map((rung) => (
            <circle key={rung.key} cx={rung.x1} cy={rung.y} r="2.4" />
          ))}
      </g>
    </g>
  ),

  // Antibody fork over receptor sites — binding and delivery.
  therapeutics: (
    <g fill="none" stroke="var(--domain)" strokeLinecap="round">
      <g opacity="0.55" strokeWidth="2">
        <path d="M125 250v-58" />
        <path d="M125 192 74 140" />
        <path d="M125 192l51-52" />
      </g>
      <g fill="var(--domain)" stroke="none">
        <circle cx="74" cy="138" r="7" opacity="0.7" />
        <circle cx="176" cy="138" r="7" opacity="0.7" />
        <circle cx="125" cy="252" r="5" opacity="0.5" />
      </g>
      <g opacity="0.2" strokeWidth="1">
        <circle cx="125" cy="192" r="74" />
        <circle cx="125" cy="192" r="110" />
      </g>
      <g fill="var(--domain)" stroke="none" opacity="0.35">
        <circle cx="46" cy="232" r="2.5" />
        <circle cx="206" cy="96" r="2" />
        <circle cx="196" cy="268" r="3" />
        <circle cx="58" cy="94" r="2" />
      </g>
    </g>
  ),

  // Vitals trace over pulse rings — response, toxicity, safety.
  clinical: (
    <g fill="none" stroke="var(--domain)" strokeLinecap="round" strokeLinejoin="round">
      <g opacity="0.16" strokeWidth="1">
        <circle cx="125" cy="180" r="52" />
        <circle cx="125" cy="180" r="86" />
        <circle cx="125" cy="180" r="120" />
      </g>
      <path
        d="M-10 180h56l14-30 18 74 20-118 21 96 16-42 15 20h110"
        strokeWidth="1.8"
        opacity="0.78"
      />
      <path d="M-10 236h270M-10 124h270" strokeWidth="1" opacity="0.12" />
      <circle cx="144" cy="182" r="4" fill="var(--domain)" stroke="none" opacity="0.8" />
    </g>
  ),

  // Reticle locked on tissue — detection and reporting.
  diagnostic: (
    <g fill="none" stroke="var(--domain)" strokeLinecap="round">
      <g opacity="0.12" strokeWidth="1">
        {[60, 100, 140, 180, 220, 260, 300].map((y) => (
          <line key={y} x1="0" y1={y} x2={W} y2={y} />
        ))}
        {[25, 75, 125, 175, 225].map((x) => (
          <line key={x} x1={x} y1="0" x2={x} y2={H} />
        ))}
      </g>
      <g fill="var(--domain)" stroke="none" filter="url(#soften)" opacity="0.4">
        <ellipse cx="112" cy="176" rx="46" ry="34" />
        <ellipse cx="168" cy="242" rx="26" ry="20" opacity="0.6" />
        <ellipse cx="66" cy="252" rx="18" ry="14" opacity="0.5" />
      </g>
      <g opacity="0.72" strokeWidth="1.6">
        <path d="M78 140h-14v-14M158 140h14v-14M78 220h-14v14M158 220h14v14" />
      </g>
      <circle cx="112" cy="176" r="3" fill="var(--domain)" stroke="none" opacity="0.9" />
    </g>
  ),
};

type DomainArtProps = {
  slug: DomainSlug;
  className?: string;
};

/**
 * Fills the card's image slot. The reference design puts a photograph here; until
 * real imagery exists each domain gets a procedural motif in its own accent, so the
 * four cards still read as one set. Swap the whole component for `<img>` when photos land.
 */
export function DomainArt({ slug, className }: DomainArtProps) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`wash-${slug}`} cx="50%" cy="32%" r="62%">
          <stop offset="0%" stopColor="var(--domain)" stopOpacity="0.42" />
          <stop offset="52%" stopColor="var(--domain)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#05070c" stopOpacity="1" />
        </radialGradient>
        <linearGradient id={`fade-${slug}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#05070c" stopOpacity="0.62" />
          <stop offset="42%" stopColor="#05070c" stopOpacity="0" />
          <stop offset="100%" stopColor="#05070c" stopOpacity="0.34" />
        </linearGradient>
        <radialGradient id={`vignette-${slug}`} cx="50%" cy="46%" r="72%">
          <stop offset="55%" stopColor="#05070c" stopOpacity="0" />
          <stop offset="100%" stopColor="#05070c" stopOpacity="0.72" />
        </radialGradient>
        <filter id="soften" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* Painted back to front: ground, accent wash, motif, depth, then the foot's colour. */}
      <rect width={W} height={H} fill="#05070c" />
      <rect width={W} height={H} fill={`url(#wash-${slug})`} />
      {motifs[slug]}
      <rect width={W} height={H} fill={`url(#fade-${slug})`} />
      <rect width={W} height={H} fill={`url(#vignette-${slug})`} />

      {/* A pool of accent at the foot for the frosted bar above it to smear — last, so
          nothing darkens it. */}
      <ellipse
        cx={W / 2}
        cy={H + 30}
        rx={W * 0.54}
        ry="46"
        fill="var(--domain)"
        opacity="0.55"
        filter="url(#soften)"
      />
    </svg>
  );
}
