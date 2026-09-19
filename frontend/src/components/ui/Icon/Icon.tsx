import type { SVGProps } from "react";

const paths = {
  play: <path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none" />,
  arrowUpRight: <path d="M7 17 17 7M9 7h8v8" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  planet: (
    <>
      <circle cx="12" cy="12" r="5.5" />
      <path d="M4.2 15.8c-1.6 1.9-2 3.4-1.2 4.1 1.4 1.3 6.5-1.3 11.3-5.9s7.7-9.4 6.3-10.7c-.8-.7-2.4-.3-4.4 1.1" />
    </>
  ),
  spark: (
    <path
      d="M12 3c.5 4.6 2.4 7 9 9-6.6 2-8.5 4.4-9 9-.5-4.6-2.4-7-9-9 6.6-2 8.5-4.4 9-9z"
      fill="currentColor"
      stroke="none"
    />
  ),
  // Brand marks adapted from Simple Icons (CC0)
  linkedin: (
    <path
      d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z"
      fill="currentColor"
      stroke="none"
    />
  ),
  x: (
    <path
      d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3zm-1.08 16.2h1.7L7.4 4.73H5.58L16.67 19.2z"
      fill="currentColor"
      stroke="none"
    />
  ),
} as const;

export type IconName = keyof typeof paths;

type IconProps = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

/** Small line-icon set drawn on a 24px grid; inherits colour from text. */
export function Icon({ name, size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
