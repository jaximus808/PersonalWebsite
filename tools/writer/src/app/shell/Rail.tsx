// The drafts rail: Blog / Projects, a search, and every draft newest first.

import { useMemo, useRef, useState } from "react";

import type { DraftSummary, Kind } from "../../shared/types";
import { plural, relativeTime } from "../format";
import { useNow } from "../hooks";
import { KIND_LABEL, KINDS, sameDraft, type DraftRef } from "../paths";
import { Icon } from "../ui/Icon";

type RailProps = {
  drafts: DraftSummary[] | null;
  loadError: string | null;
  current: DraftRef | null;
  tab: Kind;
  onTab(kind: Kind): void;
  onSelect(ref: DraftRef): void;
  onNew(kind: Kind): void;
  onImport(): void;
  onDelete(draft: DraftSummary): void;
  onRetry(): void;
  onShortcuts(): void;
  onCollapse(): void;
};

function matches(draft: DraftSummary, query: string): boolean {
  if (!query) return true;
  const haystack = `${draft.title} ${draft.slug}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export function Rail({
  drafts,
  loadError,
  current,
  tab,
  onTab,
  onSelect,
  onNew,
  onImport,
  onDelete,
  onRetry,
  onShortcuts,
  onCollapse,
}: RailProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const now = useNow();

  const counts = useMemo(() => {
    const result: Record<Kind, number> = { blog: 0, projects: 0 };
    drafts?.forEach((draft) => (result[draft.kind] += 1));
    return result;
  }, [drafts]);

  const visible = useMemo(
    () => (drafts ?? []).filter((draft) => draft.kind === tab && matches(draft, query.trim())),
    [drafts, tab, query],
  );

  return (
    <nav className="rail" aria-label="Drafts">
      <div className="rail__head">
        <span className="wordmark">Writer</span>
        <button type="button" className="icon-button" onClick={onCollapse} aria-label="Hide drafts" title="Hide drafts (⌘\)">
          <Icon name="railLeft" />
        </button>
      </div>

      <div className="rail__tabs" role="tablist" aria-label="Kind">
        {KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={tab === kind}
            className="rail__tab"
            onClick={() => onTab(kind)}
          >
            {KIND_LABEL[kind].many}
            <span className="rail__count">{counts[kind]}</span>
          </button>
        ))}
      </div>

      <label className="rail__search">
        <Icon name="search" size={14} />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setQuery("");
              searchRef.current?.blur();
            }
          }}
          placeholder="Search drafts"
          aria-label="Search drafts"
          spellCheck={false}
        />
      </label>

      <div className="rail__actions">
        <button type="button" className="rail__new" onClick={() => onNew(tab)}>
          <Icon name="plus" size={14} />
          New {KIND_LABEL[tab].one.toLowerCase()}
        </button>
        <button type="button" className="rail__import" onClick={onImport} title="Bring a published piece in as a draft">
          <Icon name="import" size={14} />
          Import
        </button>
      </div>

      <div className="rail__list">
        {loadError ? (
          <div className="rail__note">
            <p>{loadError}</p>
            <button type="button" className="text-button" onClick={onRetry}>
              Try again
            </button>
          </div>
        ) : drafts === null ? (
          <div className="rail__skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : visible.length === 0 ? (
          <p className="rail__note">
            {query
              ? "Nothing matches."
              : tab === "blog"
                ? "No posts in progress."
                : "No project write-ups in progress."}
          </p>
        ) : (
          <ul>
            {visible.map((draft) => {
              const active = sameDraft(current, draft);
              return (
                <li key={`${draft.kind}/${draft.slug}`} className={`rail__item${active ? " is-active" : ""}`}>
                  <button
                    type="button"
                    className="rail__open"
                    onClick={() => onSelect({ kind: draft.kind, slug: draft.slug })}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="rail__title">{draft.title.trim() || "Untitled"}</span>
                    <span className="rail__meta">
                      {relativeTime(draft.updatedAt, now)}
                      <span aria-hidden="true"> · </span>
                      {plural(draft.words, "word")}
                      {draft.published ? <span className="rail__badge">On site</span> : null}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rail__delete icon-button"
                    onClick={() => onDelete(draft)}
                    aria-label={`Delete ${draft.title || draft.slug}`}
                    title="Move to trash"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rail__foot">
        <button type="button" className="text-button text-button--quiet" onClick={onShortcuts}>
          <Icon name="keyboard" size={14} />
          Shortcuts
        </button>
      </div>
    </nav>
  );
}
