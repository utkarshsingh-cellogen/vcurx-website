import { planets, type PlanetId } from "@/config/content";
import { Icon } from "@/components/ui/Icon";
import styles from "./PlanetSwitcher.module.css";

type PlanetSwitcherProps = {
  active: PlanetId;
  className?: string;
};

/** Pill of planets with the active one centred; arrows jump to the neighbouring planet's section. */
export function PlanetSwitcher({ active, className }: PlanetSwitcherProps) {
  const index = planets.findIndex((p) => p.id === active);
  const prev = planets[index - 1];
  const next = planets[index + 1];
  // Show the active planet flanked by its neighbours
  const visible = [prev, planets[index], next];

  return (
    <nav className={`${styles.switcher} ${className ?? ""}`} aria-label="Planets">
      <Arrow planet={prev} direction="prev" />
      <ul className={styles.pill}>
        {visible.map((planet, i) =>
          planet ? (
            <li key={planet.id}>
              {planet.href ? (
                <a
                  href={planet.href}
                  className={`${styles.item} ${i === 1 ? styles.active : ""}`}
                  aria-current={i === 1 ? "true" : undefined}
                >
                  {i === 1 && <Icon name="planet" size={18} />}
                  {planet.name}
                </a>
              ) : (
                <span className={`${styles.item} ${styles.soon}`} title="Coming soon">
                  {planet.name}
                </span>
              )}
            </li>
          ) : (
            <li key={`empty-${i}`} className={styles.item} aria-hidden="true" />
          ),
        )}
      </ul>
      <Arrow planet={next} direction="next" />
    </nav>
  );
}

function Arrow({
  planet,
  direction,
}: {
  planet?: (typeof planets)[number];
  direction: "prev" | "next";
}) {
  const icon = direction === "prev" ? "chevronLeft" : "chevronRight";
  if (!planet?.href) {
    return (
      <span className={`${styles.arrow} ${styles.disabled}`} aria-hidden="true">
        <Icon name={icon} size={14} />
      </span>
    );
  }
  return (
    <a href={planet.href} className={styles.arrow} aria-label={`Go to ${planet.name}`}>
      <Icon name={icon} size={14} />
    </a>
  );
}
