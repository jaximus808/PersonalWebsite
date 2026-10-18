import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { FramedImage } from "../content/Frame";

export type PagerEntry = {
  href: string;
  label: string;
  /** Small caps line above the title, e.g. "Older post". */
  eyebrow: string;
  image?: string | null;
};

function PagerLink({ entry, align }: { entry: PagerEntry; align: "start" | "end" }) {
  const end = align === "end";
  return (
    <Link
      href={entry.href}
      className={`group flex min-w-0 items-center gap-4 ${end ? "flex-row-reverse text-right" : ""}`}
    >
      {/* A small thumbnail beside the title, not a card: the pager is a way
          on, and should stay quieter than the page above it. */}
      {entry.image && (
        <div className="w-24 flex-none sm:w-28">
          <FramedImage
            src={entry.image}
            ratio="wide"
            fit="cover"
            imgClassName="opacity-70 transition-opacity duration-500 ease-out group-hover:opacity-100"
          />
        </div>
      )}
      <span className="min-w-0">
        <span
          className={`flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-white/45 transition-colors duration-300 group-hover:text-blue-300 ${
            end ? "justify-end" : ""
          }`}
        >
          {!end && <ArrowLeft className="h-3 w-3 transition-transform duration-300 group-hover:-translate-x-1" />}
          {entry.eyebrow}
          {end && <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />}
        </span>
        <span className="mt-1.5 block font-cormorant text-xl font-light leading-snug text-white line-clamp-2 transition-colors duration-300 group-hover:text-blue-300">
          {entry.label}
        </span>
      </span>
    </Link>
  );
}

/** The two neighbouring entries at the foot of a post or project. */
export default function EntryPager({
  previous,
  next,
}: {
  previous: PagerEntry | null;
  next: PagerEntry | null;
}) {
  if (!previous && !next) return null;
  return (
    <nav aria-label="More" className="mt-16 grid grid-cols-1 gap-10 border-t border-white/10 pt-10 sm:grid-cols-2">
      <div>{previous && <PagerLink entry={previous} align="start" />}</div>
      <div>{next && <PagerLink entry={next} align="end" />}</div>
    </nav>
  );
}
