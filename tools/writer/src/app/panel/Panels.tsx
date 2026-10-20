// Outline, Figures, Checks and MDX: the read-mostly tabs of the right panel.

import type { FigureRequest } from "../../shared/types";
import type { ExportResult, OutlineItem, Problem } from "../doc";
import { figureUrl, type DraftRef } from "../paths";
import { CopyButton } from "../ui/CopyButton";
import { Icon } from "../ui/Icon";

// ---------------------------------------------------------------------------
// Outline

export function OutlinePanel({
  items,
  active,
  onJump,
}: {
  items: OutlineItem[];
  active: number | null;
  onJump(index: number): void;
}) {
  if (items.length === 0) {
    return (
      <div className="panel-section panel-empty">
        <p>No sections yet.</p>
        <p className="field__hint">
          Type <kbd>##</kbd> and a space, or <kbd>/</kbd> and “heading”. The page supplies the title, so sections start at level 2.
        </p>
      </div>
    );
  }
  return (
    <nav className="panel-section outline" aria-label="Outline">
      <ol>
        {items.map((item) => (
          <li key={item.index} className={`outline__item outline__item--h${item.level}`}>
            <button
              type="button"
              className={`outline__link${active === item.index ? " is-active" : ""}`}
              onClick={() => onJump(item.index)}
              aria-current={active === item.index ? "location" : undefined}
            >
              {item.text || <span className="outline__empty">Empty heading</span>}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Figures (Anatomy requests)

export function FiguresPanel({
  figures,
  draft,
  onJump,
}: {
  figures: FigureRequest[];
  draft: DraftRef;
  onJump(id: string): void;
}) {
  const ask = `build the figures for ${draft.slug}`;
  const unbuilt = figures.filter((figure) => !figure.built).length;

  if (figures.length === 0) {
    return (
      <div className="panel-section panel-empty">
        <p>No figures requested.</p>
        <p className="field__hint">
          Type <kbd>/</kbd> and “anatomy” where a picture would explain it better than words. Describe what it should
          show; Claude draws it with the Anatomy skill and it appears here when it's built.
        </p>
      </div>
    );
  }

  return (
    <div className="panel-section figures">
      <div className="ask">
        <p className="ask__text">
          {unbuilt > 0
            ? `${unbuilt} waiting. Ask Claude:`
            : "All built. To redraw one, change its prompt and ask Claude:"}
        </p>
        <div className="ask__line">
          <span className="mono">“{ask}”</span>
          <CopyButton text={ask} label="Copy" className="icon-text-button" />
        </div>
      </div>

      <ul className="figures__list">
        {figures.map((figure) => (
          <li key={figure.id} className="figure-card">
            <div className="figure-card__head">
              <span className={`status-pill${figure.built ? " status-pill--built" : ""}`}>
                {figure.built ? "Built" : "Requested"}
              </span>
              <span className="mono figure-card__id">{figure.id}</span>
              {figure.size === "hero" ? <span className="figure-card__size">hero</span> : null}
            </div>
            <p className="figure-card__title">{figure.title || "Untitled figure"}</p>
            {figure.prompt ? (
              <p className="figure-card__prompt">{figure.prompt}</p>
            ) : (
              <p className="field__error">No prompt yet: say what it should show.</p>
            )}
            <div className="figure-card__tools">
              <button type="button" className="text-button" onClick={() => onJump(figure.id)}>
                Show in draft
              </button>
              {figure.built ? (
                <a className="text-button" href={figureUrl(draft, figure.id)} target="_blank" rel="noreferrer">
                  Open
                  <Icon name="arrowUpRight" size={12} />
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Checks (lint)

export function ChecksPanel({
  problems,
  draft,
  figures,
}: {
  problems: Problem[];
  draft: DraftRef;
  figures: FigureRequest[];
}) {
  const errors = problems.filter((problem) => problem.level === "error");
  const warnings = problems.filter((problem) => problem.level === "warn");
  // build-draft stops on a figure request with no built page, so the draft
  // isn't ready until those exist, even though lint has nothing to say.
  const unbuilt = figures.filter((figure) => !figure.built).length;
  const ask = unbuilt > 0 ? `build the figures for ${draft.slug}` : `build my draft ${draft.kind}/${draft.slug}`;

  return (
    <div className="panel-section checks">
      {errors.length === 0 ? (
        <div className="checks__ready">
          <Icon name="check" size={16} />
          <div>
            <p>{unbuilt > 0 ? "Ready once the figures are built." : "Ready to build."}</p>
            <p className="field__hint">
              {unbuilt > 0
                ? `${unbuilt === 1 ? "One Anatomy figure is" : `${unbuilt} Anatomy figures are`} still a request. `
                : warnings.length > 0
                  ? "A few things to look at first, none blocking. "
                  : ""}
              {unbuilt > 0 ? "Ask Claude:" : "When it reads right, ask Claude:"}
            </p>
            <div className="ask__line">
              <span className="mono">“{ask}”</span>
              <CopyButton text={ask} label="Copy" className="icon-text-button" />
            </div>
          </div>
        </div>
      ) : (
        <p className="checks__blocked">
          {errors.length === 1 ? "One thing stops" : `${errors.length} things stop`} a clean build.
        </p>
      )}

      {problems.length > 0 ? (
        <ul className="checks__list">
          {[...errors, ...warnings].map((problem, index) => (
            <li key={index} className={`check check--${problem.level}`}>
              <span className="check__mark" aria-label={problem.level === "error" ? "Error" : "Warning"}>
                <Icon name={problem.level === "error" ? "alert" : "dot"} size={13} />
              </span>
              <span>{problem.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MDX

export function MdxPanel({
  live,
  diskMdx,
  exportError,
}: {
  live: ExportResult;
  diskMdx: string | null;
  exportError: string | null;
}) {
  const synced = live.ok && diskMdx !== null && diskMdx === live.mdx;
  return (
    <div className="panel-section mdx">
      <div className="mdx__head">
        <span className="field__hint">
          {live.ok
            ? synced
              ? "Same as draft.mdx on disk."
              : "Live. draft.mdx catches up on the next save."
            : "The export failed."}
        </span>
        {live.ok ? <CopyButton text={live.mdx} label="Copy MDX" toast="MDX copied" /> : null}
      </div>
      {exportError ? <p className="form__error">The server's export failed on the last save: {exportError}</p> : null}
      {live.ok ? (
        <pre className="mdx__source" tabIndex={0}>
          {live.mdx}
        </pre>
      ) : (
        <p className="form__error">{live.error}</p>
      )}
    </div>
  );
}
