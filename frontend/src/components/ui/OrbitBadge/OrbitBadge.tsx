import { useId } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./OrbitBadge.module.css";

type OrbitBadgeProps = {
  label: string;
  href: string;
  className?: string;
};

/** Round link with its label circling the edge and a play button at the centre. */
export function OrbitBadge({ label, href, className }: OrbitBadgeProps) {
  const id = useId().replace(/:/g, "");
  return (
    <a href={href} className={`${styles.badge} ${className ?? ""}`} aria-label={label}>
      <svg className={styles.ring} viewBox="0 0 120 120" aria-hidden="true">
        <defs>
          <path id={`orbit-${id}`} d="M60 60 m-46 0 a46 46 0 1 1 92 0 a46 46 0 1 1 -92 0" />
        </defs>
        <text className={styles.text}>
          <textPath href={`#orbit-${id}`} textLength="286">
            {`${label} ✦ ${label} ✦ `}
          </textPath>
        </text>
      </svg>
      <span className={styles.core}>
        <Icon name="play" size={18} />
      </span>
    </a>
  );
}
