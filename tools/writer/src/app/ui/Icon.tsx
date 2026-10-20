// A small set of hairline icons drawn for the writer (1.25 stroke on a 16
// grid), so the chrome stays as quiet as the type.

import type { SVGProps } from "react";

const PATHS = {
  plus: "M8 3.5v9M3.5 8h9",
  search: "M7.2 12a4.8 4.8 0 1 0 0-9.6 4.8 4.8 0 0 0 0 9.6ZM10.6 10.6l3 3",
  trash: "M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5M6.8 7v4M9.2 7v4",
  close: "M4 4l8 8M12 4l-8 8",
  railLeft: "M2.5 3.5h11v9h-11zM6 3.5v9",
  railRight: "M2.5 3.5h11v9h-11zM10 3.5v9",
  eye: "M1.8 8S4 3.8 8 3.8 14.2 8 14.2 8 12 12.2 8 12.2 1.8 8 1.8 8ZM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  pen: "M10.8 2.8l2.4 2.4L6 12.4l-3.1.7.7-3.1 7.2-7.2Z",
  upload: "M8 10.5V3M5 6l3-3 3 3M3 10.5v2h10v-2",
  image: "M2.5 3.5h11v9h-11zM2.5 10.5l3.2-3.2 2.6 2.6 1.7-1.7 3.5 3.5M10.3 6.3a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Z",
  copy: "M5.5 5.5h7v7h-7zM3.5 10.5v-7h7",
  check: "M3.5 8.5l2.8 2.8 6.2-6.6",
  alert: "M8 2.5l6 10.5H2L8 2.5ZM8 6.5v3M8 11.3v.2",
  dot: "M8 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  arrowUpRight: "M5 11l6-6M6 5h5v5",
  arrowUp: "M8 12.5v-9M4.5 7L8 3.5 11.5 7",
  arrowDown: "M8 3.5v9M4.5 9L8 12.5 11.5 9",
  chevronRight: "M6.5 4l4 4-4 4",
  import: "M8 2.5v7.5M5 7l3 3 3-3M3 11.5V13h10v-1.5",
  restore: "M3 8a5 5 0 1 0 1.5-3.6M3 2.8v2.6h2.6",
  keyboard: "M2 4.5h12v7H2zM4.5 7h.01M7 7h.01M9.5 7h.01M12 7h.01M5 9.5h6",
  sparkle: "M8 2.5c.4 2.7 2.8 5.1 5.5 5.5-2.7.4-5.1 2.8-5.5 5.5-.4-2.7-2.8-5.1-5.5-5.5 2.7-.4 5.1-2.8 5.5-5.5Z",
  link: "M6.8 9.2a2.5 2.5 0 0 0 3.5 0l2-2a2.5 2.5 0 0 0-3.5-3.5l-.6.6M9.2 6.8a2.5 2.5 0 0 0-3.5 0l-2 2a2.5 2.5 0 0 0 3.5 3.5l.6-.6",
  file: "M4 2.5h5l3 3v8H4zM9 2.5v3h3",
  list: "M5.5 4.5h8M5.5 8h8M5.5 11.5h8M2.5 4.5h.01M2.5 8h.01M2.5 11.5h.01",
  more: "M3.5 8h.01M8 8h.01M12.5 8h.01",
  refresh: "M13 8a5 5 0 1 1-1.5-3.6M13 2.8v2.6h-2.6",
  play: "M5.5 3.8v8.4L12.2 8 5.5 3.8Z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 16,
  ...rest
}: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
