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
    <Link href={entry.href} className={`group block min-w-0 ${end ? "text-right" : ""}`}>
      {entry.image && (
        <FramedImage
          src={entry.image}
          ratio="wide"
          fit="cover"
          className="mb-4"
          imgClassName="opacity-70 transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-100"
        />
      )}
      <span
        className={`flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-white/45 transition-colors duration-300 group-hover:text-blue-300 ${
          end ? "justify-end" : ""
        }`}
      >
        {!end && <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />}
        {entry.eyebrow}
        {end && <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />}
      </span>
      <span className="mt-2 block font-cormorant text-2xl font-light leading-tight text-white transition-colors duration-300 group-hover:text-blue-300">
        {entry.label}
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
