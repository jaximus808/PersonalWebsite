/**
 * The landing page's section opener: a numbered mono label over a hairline
 * (it echoes the hero's index), then an optional Cormorant title. Left-aligned
 * on the same 6xl column every home section uses.
 */
export default function SectionHead({
  n,
  label,
  title,
}: {
  n: number;
  label: string;
  title?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 md:px-12 text-left">
      <p className="font-mono text-xs text-white/55">
        <span className="text-white/30">{String(n).padStart(2, "0")}</span>{" "}
        {label}
      </p>
      <div className="mt-4 h-px w-full bg-white/10" />
      {title && (
        <h2 className="mt-10 font-cormorant font-light text-5xl md:text-6xl text-white">
          {title}
        </h2>
      )}
    </div>
  );
}

/** The home page's content column, matching SectionHead. */
export const HOME_COLUMN = "mx-auto w-full max-w-6xl px-6 md:px-12";
