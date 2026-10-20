// New draft: pick post or project, give it a title, and the slug follows the
// title until it's edited by hand. Checks the slug against the rules, the
// other drafts and what's already on the site before asking the server.

import { useEffect, useMemo, useState } from "react";

import type { DraftFile, DraftSummary, Kind, SiteEntry } from "../../shared/types";
import { api, errorMessage } from "../api";
import { KIND_LABEL, KINDS, slugify, slugProblem, sitePath, type DraftRef } from "../paths";
import { Dialog } from "../ui/Dialog";

type Props = {
  open: boolean;
  initialKind: Kind;
  /** Prefill (e.g. from a ?draft= link to a draft that doesn't exist yet). */
  initialSlug?: string;
  drafts: DraftSummary[];
  onClose(): void;
  onCreated(file: DraftFile): void;
  onOpenExisting(ref: DraftRef): void;
  onImport(ref: DraftRef): void;
};

type Conflict = { kind: "draft" | "site"; ref: DraftRef } | null;

export function NewDraftDialog({
  open,
  initialKind,
  initialSlug,
  drafts,
  onClose,
  onCreated,
  onOpenExisting,
  onImport,
}: Props) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [site, setSite] = useState<SiteEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  // Fresh form each time it opens.
  useEffect(() => {
    if (!open) return;
    setKind(initialKind);
    setTitle("");
    setSlug(initialSlug ?? "");
    setSlugEdited(!!initialSlug);
    setServerError(null);
    setTouched(false);
    setBusy(false);
    const controller = new AbortController();
    api.listSite(controller.signal).then(setSite, () => setSite([]));
    return () => controller.abort();
  }, [open, initialKind, initialSlug]);

  const effectiveSlug = slugEdited ? slug : slugify(title);
  const problem = slugProblem(effectiveSlug);

  const conflict: Conflict = useMemo(() => {
    if (problem) return null;
    const ref = { kind, slug: effectiveSlug };
    if (drafts.some((d) => d.kind === kind && d.slug === effectiveSlug)) return { kind: "draft", ref };
    if (site.some((e) => e.kind === kind && e.slug === effectiveSlug)) return { kind: "site", ref };
    return null;
  }, [drafts, site, kind, effectiveSlug, problem]);

  const canCreate = title.trim().length > 0 && !problem && !conflict && !busy;

  const submit = async () => {
    setTouched(true);
    if (!canCreate) return;
    setBusy(true);
    setServerError(null);
    try {
      const file = await api.createDraft({ kind, slug: effectiveSlug, title: title.trim() });
      onCreated(file);
    } catch (error) {
      setServerError(errorMessage(error));
      setBusy(false);
    }
  };

  const noun = KIND_LABEL[kind].one.toLowerCase();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      title={`New ${noun}`}
      lede="Start with a working title. Everything else can change later."
    >
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="segmented" role="radiogroup" aria-label="Kind">
          {KINDS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={kind === option}
              className="segmented__option"
              onClick={() => setKind(option)}
            >
              {option === "blog" ? "Blog post" : "Project write-up"}
            </button>
          ))}
        </div>

        <label className="field">
          <span className="field__label">Title</span>
          <input
            data-autofocus
            className="input input--display"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={kind === "blog" ? "What's it about?" : "What did you build?"}
            autoComplete="off"
            spellCheck
          />
          {touched && !title.trim() ? <span className="field__error">Give it a title.</span> : null}
        </label>

        <label className="field">
          <span className="field__label">
            Slug
            {slugEdited ? (
              <button
                type="button"
                className="text-button text-button--inline"
                onClick={() => {
                  setSlugEdited(false);
                  setSlug("");
                }}
              >
                Follow title
              </button>
            ) : null}
          </span>
          <div className="input-affix">
            <span className="input-affix__prefix">/{kind}/</span>
            <input
              className="input input--mono"
              value={effectiveSlug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(event.target.value);
              }}
              onBlur={() => {
                // Tidy obvious slips ("My Post " -> "my-post") but leave real errors visible.
                if (slugEdited && slug && slugProblem(slug)) {
                  const tidy = slugify(slug);
                  if (tidy && !slugProblem(tidy)) setSlug(tidy);
                }
              }}
              placeholder="the-slug"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!problem && (touched || slugEdited)}
            />
          </div>
          {problem && (touched || slugEdited) ? (
            <span className="field__error">{problem}</span>
          ) : conflict?.kind === "draft" ? (
            <span className="field__error">
              A draft already uses this slug.{" "}
              <button type="button" className="text-button text-button--inline" onClick={() => onOpenExisting(conflict.ref)}>
                Open it
              </button>
            </span>
          ) : conflict?.kind === "site" ? (
            <span className="field__error">
              {sitePath(conflict.ref)} is already on the site.{" "}
              <button type="button" className="text-button text-button--inline" onClick={() => onImport(conflict.ref)}>
                Import it to edit
              </button>
            </span>
          ) : (
            <span className="field__hint">
              The page will live at <span className="mono">{sitePath({ kind, slug: effectiveSlug || "…" })}</span>.
            </span>
          )}
        </label>

        {serverError ? <p className="form__error">{serverError}</p> : null}

        <div className="dialog__actions">
          <button type="button" className="button button--quiet" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="button button--primary" disabled={busy || (touched && !canCreate)}>
            {busy ? "Creating…" : `Start writing`}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
