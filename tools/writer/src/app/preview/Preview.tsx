// Preview: the draft as the site will render it. Title, date and cover on top
// like pages/blog/[slug].tsx and pages/projects/[slug].tsx, then the exported
// MDX body compiled in the browser with the preview components.

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";

import type { DraftDoc, DraftMeta, FigureRequest } from "../../shared/types";
import { safeMdxBody, safeReferencedAssets } from "../doc";
import { formatDate, formatMonthYear, readingMinutes } from "../format";
import { resolveExportedSrc, resolveSrc, type DraftRef } from "../paths";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { Icon } from "../ui/Icon";
import { compileMdx, describeCompileError, jsxNames, type CompiledMdx } from "./evaluate";
import { FramedImage } from "./Media";
import { PreviewVideo, previewComponents, type PreviewContext } from "./components";

type Props = {
  meta: DraftMeta;
  doc: DraftDoc;
  words: number;
  figures: FigureRequest[];
};

const COMPILE_DELAY_MS = 180;

function PreviewHeader({ meta, words, resolveDocSrc }: { meta: DraftMeta; words: number; resolveDocSrc(src: string): string }) {
  if (meta.kind === "blog") {
    return (
      <>
        <header>
          <p className="page-eyebrow">
            <time dateTime={meta.date}>{formatDate(meta.date)}</time>
            <span aria-hidden="true">·</span>
            {/* The site estimates at 220 words a minute (lib/contentText.ts). */}
            <span>{Math.max(1, Math.ceil(words / 220))} min read</span>
          </p>
          <h1 className="page-title page-title--blog">{meta.title || "Untitled"}</h1>
        </header>
        {meta.cover ? <FramedImage src={resolveDocSrc(meta.cover)} className="page-cover" /> : null}
      </>
    );
  }

  const links = (meta.links ?? []).filter((link) => link.label.trim() && link.href.trim());
  return (
    <>
      <header>
        <p className="page-eyebrow">
          {/* The site adds "№ NN", the project's place in the catalogue, at build time. */}
          <span>Project</span>
          <span aria-hidden="true">·</span>
          <time dateTime={meta.date}>{formatMonthYear(meta.date)}</time>
          {meta.featured ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="page-eyebrow__accent">Featured</span>
            </>
          ) : null}
        </p>
        <h1 className="page-title page-title--projects">{meta.title || "Untitled"}</h1>
        {meta.summary ? <p className="page-summary">{meta.summary}</p> : null}
        {links.length > 0 ? (
          <ul className="page-links">
            {links.map((link) => (
              <li key={`${link.label}-${link.href}`}>
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                  <Icon name="arrowUpRight" size={14} />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </header>
      {!meta.hideCover && (meta.youtube || meta.cover) ? (
        <div className="page-hero">
          {meta.youtube ? (
            <PreviewVideo youtube={meta.youtube} poster={meta.cover} title={meta.title} resolve={resolveDocSrc} />
          ) : (
            <FramedImage src={resolveDocSrc(meta.cover!)} alt={meta.title} ratio="wide" />
          )}
        </div>
      ) : null}
    </>
  );
}

export const Preview = forwardRef<HTMLDivElement, Props>(function Preview({ meta, doc, words, figures }, ref) {
  const draft: DraftRef = useMemo(() => ({ kind: meta.kind, slug: meta.slug }), [meta.kind, meta.slug]);
  const body = useMemo(() => safeMdxBody(doc, draft), [doc, draft]);

  const [compiled, setCompiled] = useState<{ Content: CompiledMdx; names: string[]; source: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(true);
  const latest = useRef(0);

  useEffect(() => {
    if (!body.ok) {
      setError(`The export failed: ${body.error}`);
      setCompiling(false);
      return;
    }
    const run = ++latest.current;
    setCompiling(true);
    const timer = window.setTimeout(() => {
      compileMdx(body.mdx).then(
        (Content) => {
          if (run !== latest.current) return;
          setCompiled({ Content, names: jsxNames(body.mdx), source: body.mdx });
          setError(null);
          setCompiling(false);
        },
        (err: unknown) => {
          if (run !== latest.current) return;
          // Keep the last good render on screen and say what broke.
          setError(describeCompileError(err));
          setCompiling(false);
        },
      );
    }, compiled ? COMPILE_DELAY_MS : 0);
    return () => window.clearTimeout(timer);
    // compiled only decides the first-run delay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [body]);

  const assets = useMemo(() => new Set(safeReferencedAssets(meta, doc)), [meta, doc]);
  const ctx: PreviewContext = useMemo(
    () => ({ resolve: (src) => resolveExportedSrc(src, draft, assets), figures, slug: draft.slug }),
    [draft, figures, assets],
  );
  const components = useMemo(() => previewComponents(ctx, compiled?.names ?? []), [ctx, compiled?.names]);
  const resolveDocSrc = (src: string) => resolveSrc(src, draft);

  return (
    <div className="preview" ref={ref}>
      {error ? (
        <div className="preview__error" role="alert">
          <Icon name="alert" size={14} />
          <div>
            <p>This wouldn't compile on the site yet.</p>
            <p className="mono">{error}</p>
          </div>
        </div>
      ) : null}

      <article className={`page page--${meta.kind}`}>
        <PreviewHeader meta={meta} words={words} resolveDocSrc={resolveDocSrc} />
        <div className={`prose page-body page-body--${meta.kind}`} data-preview-body>
          {compiled ? (
            <ErrorBoundary
              resetKey={compiled.source}
              fallback={(err) => (
                <p className="preview__runtime-error">A component failed to render: {err.message}</p>
              )}
            >
              <compiled.Content components={components} />
            </ErrorBoundary>
          ) : compiling ? (
            <p className="preview__loading">Rendering…</p>
          ) : null}
        </div>
      </article>
      <p className="preview__foot">
        Preview · {readingMinutes(words)} min at 200 wpm · links open in a new tab
      </p>
    </div>
  );
});
