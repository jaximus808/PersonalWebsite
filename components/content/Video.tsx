import { useState } from "react";
import { Play } from "lucide-react";

import { Frame } from "./Frame";
import { Caption } from "./Figure";
import { usePrefersReducedMotion } from "../../lib/usePrefersReducedMotion";

type VideoProps = {
  /** A YouTube video id (the part after watch?v=). */
  youtube?: string;
  /** Or a video file, e.g. /projects/tandem/queue-loop.mp4. */
  src?: string;
  /** Still shown before playback. YouTube falls back to its own thumbnail. */
  poster?: string;
  /** Play silently on a loop, like a moving screenshot (files only). */
  loop?: boolean;
  caption?: React.ReactNode;
  title?: string;
  /** Load the poster at once (for the first media on a page). */
  priority?: boolean;
};

/**
 * A 16:9 video in the shared frame.
 *
 *   <Video youtube="ztsJ87zMOS0" />
 *   <Video src="/projects/x/demo.mp4" poster="/projects/x/demo.jpg" loop />
 *
 * YouTube loads only after a click, so a page full of videos stays light.
 */
export default function Video({
  youtube,
  src,
  poster,
  loop = false,
  caption,
  title = "Video",
  priority = false,
}: VideoProps) {
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);

  let body: React.ReactNode = null;
  if (youtube) {
    const still = poster ?? `https://i.ytimg.com/vi/${youtube}/hqdefault.jpg`;
    body = playing ? (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtube)}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    ) : (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Play ${title}`}
        className="group absolute inset-0 h-full w-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={still}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-85 transition-opacity duration-500 ease-out group-hover:opacity-100"
        />
        <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#121212]/70 ring-1 ring-white/25 backdrop-blur-md transition-[background-color,box-shadow] duration-500 ease-out group-hover:bg-[#121212]/85 group-hover:ring-blue-300/60">
          <Play className="ml-0.5 h-6 w-6 fill-white text-white" />
        </span>
      </button>
    );
  } else if (src) {
    const ambient = loop && !reduced;
    body = (
      <video
        // Remount when motion preference flips so autoplay follows it.
        key={ambient ? "ambient" : "manual"}
        src={src}
        poster={poster}
        title={title}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        preload="metadata"
        {...(ambient
          ? { autoPlay: true, muted: true, loop: true }
          : { controls: true, loop })}
      />
    );
  }

  return (
    <figure className="my-10">
      <Frame ratio="wide">{body}</Frame>
      {caption ? <Caption>{caption}</Caption> : null}
    </figure>
  );
}
