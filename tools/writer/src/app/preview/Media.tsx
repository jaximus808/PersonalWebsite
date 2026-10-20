// The site's frame (components/content/Frame.tsx) rebuilt without Tailwind:
// one box every image sits in, a fixed shape, and with fit="contain" a
// blurred copy of the image filling the letterbox.

import { useState, type ReactNode } from "react";

import type { Fit, Ratio } from "../../shared/types";

export const RATIOS: Record<Ratio, string> = {
  wide: "16 / 9",
  standard: "3 / 2",
  square: "1 / 1",
  tall: "4 / 5",
};

export function Frame({
  ratio = "standard",
  className = "",
  children,
}: {
  ratio?: Ratio;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`frame ${className}`} style={{ aspectRatio: RATIOS[ratio] ?? RATIOS.standard }}>
      {children}
    </div>
  );
}

export function FramedImage({
  src,
  alt = "",
  ratio = "standard",
  fit = "contain",
  className = "",
}: {
  src: string;
  alt?: string;
  ratio?: Ratio;
  fit?: Fit;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const broken = !src || failed === src;
  return (
    <Frame ratio={ratio} className={className}>
      {broken ? (
        <span className="frame__missing">
          {src ? "Image not found" : "No image yet"}
          {src ? <span className="mono">{src.replace(/^\/(drafts|site)\//, "")}</span> : null}
        </span>
      ) : (
        <>
          {fit === "contain" ? (
            <img src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" className="frame__fill" />
          ) : null}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={`frame__img frame__img--${fit}`}
            onError={() => setFailed(src)}
          />
        </>
      )}
    </Frame>
  );
}

export function Caption({ children }: { children: ReactNode }) {
  return <figcaption className="caption">{children}</figcaption>;
}
