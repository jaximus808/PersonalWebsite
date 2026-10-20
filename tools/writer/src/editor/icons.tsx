// A small line-icon set for the editor's menus and toolbars: 24px grid,
// 1.5 stroke, round joins, drawn to sit quietly next to Montserrat 300.
// Icons are decorative; every button that uses one carries its own label.

import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function icon(paths: ReactNode) {
  return function Icon({ size = 16, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...rest}
      >
        {paths}
      </svg>
    );
  };
}

export const IconBold = icon(<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" />);
export const IconItalic = icon(<path d="M10 5h8M6 19h8M14.5 5l-5 14" />);
export const IconStrike = icon(
  <>
    <path d="M4 12h16" />
    <path d="M16.5 7.5C16 5.9 14.3 5 12 5c-2.7 0-4.5 1.3-4.5 3.2 0 1.2.7 2.1 2 2.8M8 16.6c.6 1.5 2.3 2.4 4.4 2.4 2.8 0 4.6-1.3 4.6-3.3 0-.6-.1-1.1-.4-1.6" />
  </>,
);
export const IconCode = icon(<path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />);
export const IconLink = icon(
  <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
);
export const IconUnlink = icon(
  <>
    <path d="M14.5 15.5l-1.8 1.8a4 4 0 0 1-5.7-5.7l1.8-1.8M15.5 14.5l1.8-1.8a4 4 0 0 0-5.7-5.7L9.8 8.8" />
    <path d="M4 4l16 16" />
  </>,
);
export const IconExternal = icon(<path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" />);
export const IconQuote = icon(
  <path d="M8 10H5.5a.5.5 0 0 1-.5-.5V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4c0 3-1.5 5-4 6M18 10h-2.5a.5.5 0 0 1-.5-.5V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4c0 3-1.5 5-4 6" />,
);
export const IconText = icon(<path d="M5 7V5h14v2M12 5v14M9 19h6" />);
export const IconList = icon(
  <>
    <path d="M10 6h10M10 12h10M10 18h10" />
    <circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" />
  </>,
);
export const IconListOrdered = icon(<path d="M10 6h10M10 12h10M10 18h10M4 5l1.5-1v5M4 9h3M4 14.5a1.5 1.5 0 0 1 3 0c0 1.5-3 2-3 3.5h3" />);
export const IconChecklist = icon(
  <>
    <rect x="3.5" y="4.5" width="5" height="5" rx="1" />
    <path d="M4.8 15.8l1.2 1.2 2.4-2.6" />
    <path d="M12 7h8M12 16h8" />
  </>,
);
export const IconCodeBlock = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M10 10l-2 2 2 2M14 10l2 2-2 2" />
  </>,
);
export const IconTable = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9.5h18M3 15h18M10 9.5V20" />
  </>,
);
export const IconImage = icon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="9.5" r="1.5" />
    <path d="M21 15.5l-4.5-4.5L7 20" />
  </>,
);
export const IconGallery = icon(
  <>
    <rect x="3" y="4" width="8" height="7" rx="1.5" />
    <rect x="13" y="4" width="8" height="7" rx="1.5" />
    <rect x="3" y="13" width="8" height="7" rx="1.5" />
    <rect x="13" y="13" width="8" height="7" rx="1.5" />
  </>,
);
export const IconVideo = icon(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M10.5 9.5v5l4-2.5z" fill="currentColor" stroke="none" />
  </>,
);
export const IconCallout = icon(
  <>
    <path d="M5 4v16" />
    <path d="M9 8h10M9 12h10M9 16h6" />
  </>,
);
export const IconPullQuote = icon(<path d="M6 7h12M4 12h16M7 17h10" />);
export const IconDivider = icon(<path d="M4 12h16M9 6h6M9 18h6" />);
export const IconAnatomy = icon(
  <>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
  </>,
);
export const IconMdx = icon(
  <>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6 15V9l2 2.5L10 9v6M15.5 9v6M13.5 13l2 2 2-2" />
  </>,
);
export const IconGrip = icon(
  <>
    {[7, 12, 17].map((y) => (
      <g key={y}>
        <circle cx="9" cy={y} r="1.1" fill="currentColor" stroke="none" />
        <circle cx="15" cy={y} r="1.1" fill="currentColor" stroke="none" />
      </g>
    ))}
  </>,
);
export const IconPlus = icon(<path d="M12 5v14M5 12h14" />);
export const IconTrash = icon(<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 11v5M13.5 11v5" />);
export const IconDuplicate = icon(
  <>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </>,
);
export const IconArrowUp = icon(<path d="M12 19V5M6 11l6-6 6 6" />);
export const IconArrowDown = icon(<path d="M12 5v14M6 13l6 6 6-6" />);
export const IconArrowLeft = icon(<path d="M19 12H5M11 6l-6 6 6 6" />);
export const IconArrowRight = icon(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IconUpload = icon(<path d="M12 16V4M7 9l5-5 5 5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />);
export const IconReplace = icon(<path d="M4 9a8 8 0 0 1 14-3l2 2M20 4v4h-4M20 15a8 8 0 0 1-14 3l-2-2M4 20v-4h4" />);
export const IconCheck = icon(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconClose = icon(<path d="M6 6l12 12M18 6L6 18" />);
export const IconCopy = icon(
  <>
    <rect x="8" y="8" width="12" height="12" rx="2" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </>,
);
export const IconReload = icon(<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5M20 4v4.5h-4.5" />);
export const IconPlay = icon(<path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" />);
export const IconLoop = icon(<path d="M17 4l3 3-3 3M4 11V9a2 2 0 0 1 2-2h14M7 20l-3-3 3-3M20 13v2a2 2 0 0 1-2 2H4" />);
export const IconAlt = icon(
  <>
    <rect x="3" y="6" width="18" height="12" rx="2" />
    <path d="M7 15l2.2-6 2.2 6M7.8 13h2.8M14 9v6h3" />
  </>,
);
export const IconChevronDown = icon(<path d="M6 9l6 6 6-6" />);
export const IconRowAbove = icon(
  <>
    <rect x="3" y="11" width="18" height="9" rx="1.5" />
    <path d="M12 3v6M9 6h6" />
  </>,
);
export const IconRowBelow = icon(
  <>
    <rect x="3" y="4" width="18" height="9" rx="1.5" />
    <path d="M12 15v6M9 18h6" />
  </>,
);
export const IconColLeft = icon(
  <>
    <rect x="11" y="3" width="9" height="18" rx="1.5" />
    <path d="M3 12h6M6 9v6" />
  </>,
);
export const IconColRight = icon(
  <>
    <rect x="4" y="3" width="9" height="18" rx="1.5" />
    <path d="M15 12h6M18 9v6" />
  </>,
);
export const IconRowDelete = icon(
  <>
    <rect x="3" y="8" width="18" height="8" rx="1.5" />
    <path d="M10 10.5l4 3M14 10.5l-4 3" />
  </>,
);
export const IconColDelete = icon(
  <>
    <rect x="8" y="3" width="8" height="18" rx="1.5" />
    <path d="M10.5 10l3 4M13.5 10l-3 4" />
  </>,
);
