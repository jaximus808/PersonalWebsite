// Loading placeholders for the blog pages. Each one mirrors the layout of the
// content it stands in for, so nothing jumps when the real content arrives.
// The pulse is slow and faint, and is switched off entirely under
// prefers-reduced-motion (motion-safe only applies the animation otherwise).

const PULSE = "motion-safe:animate-[pulse_2.6s_ease-in-out_infinite]";

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-white/[0.07] ${className}`} />;
}

/** Skeleton for a single article, sized to the reading column it sits in. */
export function ArticleSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading post</span>
      <div aria-hidden="true" className={PULSE}>
        {/* eyebrow: date and reading time */}
        <Bar className="h-3 w-48" />
        {/* title */}
        <Bar className="mt-6 h-10 md:h-12 w-full" />
        <Bar className="mt-4 h-10 md:h-12 w-3/5" />
        {/* hero */}
        <div className="mt-10 aspect-[16/9] w-full rounded-xl bg-white/[0.05]" />
        {/* paragraphs */}
        <div className="mt-12 space-y-4">
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-11/12" />
          <Bar className="h-4 w-4/5" />
        </div>
        <div className="mt-10 space-y-4">
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-10/12" />
          <Bar className="h-4 w-full" />
          <Bar className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton rows matching the editorial list on /blog. */
export function BlogListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="border-t border-white/10"
    >
      <span className="sr-only">Loading posts</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`grid grid-cols-1 md:grid-cols-[1fr_auto] items-start gap-6 md:gap-10 py-9 border-b border-white/10 ${PULSE}`}
        >
          <div className="min-w-0">
            <Bar className="h-3 w-40" />
            <Bar className="mt-4 h-8 md:h-9 w-4/5" />
            <Bar className="mt-5 h-3.5 w-full" />
            <Bar className="mt-2.5 h-3.5 w-2/3" />
            <Bar className="mt-6 h-3 w-16" />
          </div>
          <div className="hidden md:block h-28 w-44 flex-none rounded-xl bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

export default ArticleSkeleton;
