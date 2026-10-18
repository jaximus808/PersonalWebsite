// Small typographic pieces for breaking up long writing.

/**
 * A quiet section break. With a label, the label sits between two lines.
 *
 *   <Divider />
 *   <Divider label="Part two" />
 */
export function Divider({ label }: { label?: string }) {
  if (!label) {
    return <hr className="mx-auto my-14 h-px w-16 border-0 bg-white/25" />;
  }
  return (
    <div role="separator" aria-label={label} className="my-14 flex items-center gap-5">
      <span aria-hidden="true" className="h-px flex-1 bg-white/15" />
      <span className="text-[0.7rem] uppercase tracking-[0.18em] text-white/50">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-white/15" />
    </div>
  );
}

/**
 * A line worth lifting out of the text.
 *
 *   <PullQuote>The artifact is the shared memory.</PullQuote>
 */
export function PullQuote({ children, cite }: { children: React.ReactNode; cite?: string }) {
  return (
    <figure className="my-14 text-center">
      {/* A div, not <blockquote>: the article's blockquote styling is for quoted passages. */}
      <div className="font-cormorant text-[1.9em] font-light leading-[1.25] text-white text-balance">
        {children}
      </div>
      {cite ? (
        <figcaption className="mt-4 text-[0.7rem] uppercase tracking-[0.18em] text-white/50">
          {cite}
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * An aside: a note, a caveat, a "by the way".
 *
 *   <Callout title="Update">This shipped in March.</Callout>
 */
export function Callout({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <aside className="my-10 rounded border-l border-blue-300/50 bg-white/[0.035] px-6 py-5 text-[0.92em] [&>*:last-child]:mb-0">
      {title ? (
        <p className="!mb-2 text-[0.7rem] uppercase tracking-[0.18em] text-blue-300/80">{title}</p>
      ) : null}
      {children}
    </aside>
  );
}
