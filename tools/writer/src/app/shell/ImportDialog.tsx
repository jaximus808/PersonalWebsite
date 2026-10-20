// Import from the site: every published post and project, so an existing
// piece can be reopened in the writer (its images come along into assets/).

import { useEffect, useMemo, useState } from "react";

import type { DraftFile, Kind, SiteEntry } from "../../shared/types";
import { api, errorMessage } from "../api";
import { formatDate } from "../format";
import { KIND_LABEL, KINDS, type DraftRef } from "../paths";
import { Dialog } from "../ui/Dialog";
import { Icon } from "../ui/Icon";

type Props = {
  open: boolean;
  /** Jump straight to one entry (from the new-draft slug conflict). */
  focus?: DraftRef | null;
  onClose(): void;
  onImported(file: DraftFile): void;
  onOpenDraft(ref: DraftRef): void;
};

export function ImportDialog({ open, focus, onClose, onImported, onOpenDraft }: Props) {
  const [entries, setEntries] = useState<SiteEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<Kind | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ key: string; message: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setEntries(null);
    setLoadError(null);
    setRowError(null);
    setBusy(null);
    setQuery(focus?.slug ?? "");
    setKind(focus?.kind ?? "all");
    const controller = new AbortController();
    api.listSite(controller.signal).then(
      (list) => setEntries([...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))),
      (error) => {
        if (!controller.signal.aborted) setLoadError(errorMessage(error));
      },
    );
    return () => controller.abort();
  }, [open, focus]);

  const visible = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return (entries ?? []).filter(
      (entry) =>
        (kind === "all" || entry.kind === kind) &&
        words.every((word) => `${entry.title} ${entry.slug}`.toLowerCase().includes(word)),
    );
  }, [entries, query, kind]);

  const importEntry = async (entry: SiteEntry) => {
    const key = `${entry.kind}/${entry.slug}`;
    setBusy(key);
    setRowError(null);
    try {
      onImported(await api.importEntry(entry.kind, entry.slug));
    } catch (error) {
      setRowError({ key, message: errorMessage(error) });
      setBusy(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy !== null}
      size="wide"
      title="Import from the site"
      lede="Opens a published piece as a draft. The site file stays untouched until you build it again."
    >
      <div className="import">
        <div className="import__filters">
          <label className="rail__search import__search">
            <Icon name="search" size={14} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search posts and projects"
              aria-label="Search the site"
              data-autofocus
            />
          </label>
          <div className="segmented segmented--small" role="radiogroup" aria-label="Kind">
            {(["all", ...KINDS] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={kind === option}
                className="segmented__option"
                onClick={() => setKind(option)}
              >
                {option === "all" ? "All" : KIND_LABEL[option].many}
              </button>
            ))}
          </div>
        </div>

        <div className="import__list">
          {loadError ? (
            <p className="import__note">{loadError}</p>
          ) : entries === null ? (
            <p className="import__note">Reading content/…</p>
          ) : visible.length === 0 ? (
            <p className="import__note">Nothing matches.</p>
          ) : (
            <ul>
              {visible.map((entry) => {
                const key = `${entry.kind}/${entry.slug}`;
                return (
                  <li key={key} className="import__row">
                    <div className="import__text">
                      <span className="import__title">{entry.title || entry.slug}</span>
                      <span className="import__meta">
                        {KIND_LABEL[entry.kind].one} · {formatDate(entry.date)} ·{" "}
                        <span className="mono">{entry.slug}</span>
                      </span>
                      {rowError?.key === key ? <span className="field__error">{rowError.message}</span> : null}
                    </div>
                    {entry.drafted ? (
                      <button
                        type="button"
                        className="button button--quiet button--small"
                        onClick={() => onOpenDraft({ kind: entry.kind, slug: entry.slug })}
                      >
                        Open draft
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button--small"
                        disabled={busy !== null}
                        onClick={() => void importEntry(entry)}
                      >
                        {busy === key ? "Importing…" : "Import"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Dialog>
  );
}
