// The one box every image and video on a post or project page sits in.
// Sources arrive in every size (a 100px thumbnail, a tall phone screenshot, a
// 2880px GIF); the frame fixes the shape so the page keeps one rhythm. With
// fit="contain" the whole image shows, and a blurred copy of it fills the
// letterbox so the empty space reads as intentional.

import type { ReactNode } from "react";

export const RATIOS = {
  wide: "16 / 9",
  standard: "3 / 2",
  square: "1 / 1",
  tall: "4 / 5",
} as const;

export type Ratio = keyof typeof RATIOS;
export type Fit = "contain" | "cover";

type FrameProps = {
  ratio?: Ratio;
  /** No rounding or outline, for frames inside a card that already has them. */
  bare?: boolean;
  className?: string;
  children: ReactNode;
};

export function Frame({ ratio = "standard", bare = false, className = "", children }: FrameProps) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-white/[0.03] ${
        bare ? "" : "rounded-xl ring-1 ring-white/10"
      } ${className}`}
      style={{ aspectRatio: RATIOS[ratio] }}
    >
      {children}
    </div>
  );
}

type FramedImageProps = {
  src: string;
  alt?: string;
  ratio?: Ratio;
  fit?: Fit;
  /** Load at once instead of lazily (for the first image on a page). */
  priority?: boolean;
  bare?: boolean;
  className?: string;
  imgClassName?: string;
};

export function FramedImage({
  src,
  alt = "",
  ratio = "standard",
  fit = "contain",
  priority = false,
  bare = false,
  className = "",
  imgClassName = "",
}: FramedImageProps) {
  const loading = priority ? "eager" : "lazy";
  return (
    <Frame ratio={ratio} bare={bare} className={className}>
      {fit === "contain" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading={loading}
          decoding="async"
          className="absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-2xl"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        className={`absolute inset-0 h-full w-full ${
          fit === "cover" ? "object-cover" : "object-contain"
        } ${imgClassName}`}
      />
    </Frame>
  );
}
