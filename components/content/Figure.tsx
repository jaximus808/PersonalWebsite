import { FramedImage, type Fit, type Ratio } from "./Frame";

export function Caption({ children }: { children: React.ReactNode }) {
  return (
    <figcaption className="mt-3 text-center text-[0.8rem] font-light leading-relaxed text-white/55">
      {children}
    </figcaption>
  );
}

type FigureProps = {
  src: string;
  alt?: string;
  caption?: React.ReactNode;
  /** Frame shape. Defaults to "standard" (3:2). */
  ratio?: Ratio;
  /** "contain" (default) shows the whole image; "cover" fills the frame. */
  fit?: Fit;
};

/**
 * An image in the shared frame, with an optional caption.
 *
 *   <Figure src="/blog/my-post/1.jpg" caption="The first prototype" />
 *   <Figure src="/projects/x/board.png" ratio="wide" fit="cover" />
 *
 * Markdown images (![alt](src)) render through this too.
 */
export default function Figure({
  src,
  alt,
  caption,
  ratio,
  fit,
}: FigureProps) {
  return (
    <figure className="my-10">
      <FramedImage src={src} alt={alt ?? (typeof caption === "string" ? caption : "")} ratio={ratio} fit={fit} />
      {caption ? <Caption>{caption}</Caption> : null}
    </figure>
  );
}
