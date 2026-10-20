// The calm screens around the writing: nothing open yet, a draft that isn't
// there, a server that isn't answering, unsaved work to restore, shortcuts.

import type { DraftSummary, Kind } from "../../shared/types";
import { formatClock, relativeTime } from "../format";
import { KIND_LABEL, type DraftRef } from "../paths";
import type { LocalCopy } from "../recovery";
import { Dialog } from "../ui/Dialog";
import { Icon } from "../ui/Icon";

export function EmptyState({
  recent,
  onNew,
  onImport,
  onSelect,
}: {
  recent: DraftSummary[];
  onNew(kind: Kind): void;
  onImport(): void;
  onSelect(ref: DraftRef): void;
}) {
  return (
    <div className="empty">
      <p className="eyebrow">jaxonp.com · writer</p>
      <h1 className="empty__title">What are you thinking about?</h1>
      <p className="empty__lede">
        Write it here the way it will read on the site. Images, code, callouts and figures go in as you go; Claude turns
        it into the page when it's ready.
      </p>
      <div className="empty__actions">
        <button type="button" className="button button--primary" onClick={() => onNew("blog")}>
          <Icon name="plus" size={14} />
          New post
        </button>
        <button type="button" className="button" onClick={() => onNew("projects")}>
          <Icon name="plus" size={14} />
          New project
        </button>
        <button type="button" className="button button--quiet" onClick={onImport}>
          <Icon name="import" size={14} />
          Import from the site
        </button>
      </div>

      {recent.length > 0 ? (
        <section className="empty__recent">
          <h2 className="eyebrow">Pick up where you left off</h2>
          <ul>
            {recent.map((draft) => (
              <li key={`${draft.kind}/${draft.slug}`}>
                <button type="button" onClick={() => onSelect({ kind: draft.kind, slug: draft.slug })}>
                  <span className="empty__recent-title">{draft.title || "Untitled"}</span>
                  <span className="empty__recent-meta">
                    {KIND_LABEL[draft.kind].one} · {relativeTime(draft.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function MissingDraft({
  draft,
  onCreate,
  onClose,
}: {
  draft: DraftRef;
  onCreate(): void;
  onClose(): void;
}) {
  return (
    <div className="empty empty--small">
      <p className="eyebrow">Not found</p>
      <h1 className="empty__title">There's no draft at {draft.kind}/{draft.slug}.</h1>
      <p className="empty__lede">It may have been moved to the trash, or not started yet.</p>
      <div className="empty__actions">
        <button type="button" className="button button--primary" onClick={onCreate}>
          Start it now
        </button>
        <button type="button" className="button button--quiet" onClick={onClose}>
          Back
        </button>
      </div>
    </div>
  );
}

export function LoadFailed({ message, onRetry }: { message: string; onRetry(): void }) {
  return (
    <div className="empty empty--small">
      <p className="eyebrow">Couldn't open the draft</p>
      <h1 className="empty__title">The writer's server didn't answer.</h1>
      <p className="empty__lede">{message}</p>
      <div className="empty__actions">
        <button type="button" className="button button--primary" onClick={onRetry}>
          <Icon name="refresh" size={14} />
          Try again
        </button>
      </div>
    </div>
  );
}

export function RecoveryBanner({
  copy,
  onRestore,
  onDismiss,
}: {
  copy: LocalCopy;
  onRestore(): void;
  onDismiss(): void;
}) {
  return (
    <div className="banner" role="alert">
      <Icon name="restore" size={16} />
      <p>
        This browser kept changes from {relativeTime(copy.editedAt)} ({formatClock(copy.editedAt)}) that never reached
        the disk.
      </p>
      <div className="banner__actions">
        <button type="button" className="button button--small button--primary" onClick={onRestore}>
          Restore them
        </button>
        <button type="button" className="button button--small button--quiet" onClick={onDismiss}>
          Keep the saved copy
        </button>
      </div>
    </div>
  );
}

const SHORTCUTS: { keys: string[]; what: string }[] = [
  { keys: ["⌘", "S"], what: "Save now (it also saves on its own)" },
  { keys: ["⌘", "⇧", "P"], what: "Write / Preview" },
  { keys: ["⌘", "\\"], what: "Show or hide drafts" },
  { keys: ["⌘", "."], what: "Show or hide the panel" },
  { keys: ["/"], what: "Insert a block: image, gallery, video, code, callout, figure…" },
  { keys: ["##", "space"], what: "Section heading (### and #### for smaller)" },
  { keys: ["-", "space"], what: "Bulleted list (1. for numbered, [ ] for a checklist)" },
  { keys: [">", "space"], what: "Quote" },
  { keys: ["```"], what: "Code block" },
  { keys: ["---"], what: "Divider" },
  { keys: ["⌘", "B / I / E"], what: "Bold, italic, inline code" },
  { keys: ["⌘", "K"], what: "Link" },
  { keys: ["⌘", "⌥", "2 / 3 / 4"], what: "Heading levels" },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Shortcuts" lede="Write; the formatting follows.">
      <dl className="shortcuts">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.what} className="shortcuts__row">
            <dt>
              {shortcut.keys.map((key) => (
                <kbd key={key}>{key}</kbd>
              ))}
            </dt>
            <dd>{shortcut.what}</dd>
          </div>
        ))}
      </dl>
      <p className="field__hint shortcuts__foot">
        Drop or paste images anywhere in the text. Several at once become a gallery; a YouTube link on an empty line
        becomes a video.
      </p>
    </Dialog>
  );
}
