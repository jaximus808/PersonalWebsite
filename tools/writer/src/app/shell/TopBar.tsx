// The thin bar over the page: where you are, whether it's on disk, how long
// it is, and Write / Preview.

import type { UploadItem } from "../hooks";
import { formatClock, plural, readingMinutes } from "../format";
import { KIND_LABEL, type DraftRef } from "../paths";
import type { SaveState } from "../useDraftSession";
import { Icon } from "../ui/Icon";

export type Mode = "write" | "preview";

type Props = {
  current: DraftRef | null;
  save: SaveState | null;
  words: number | null;
  mode: Mode;
  uploads: UploadItem[];
  railOpen: boolean;
  panelOpen: boolean;
  onMode(mode: Mode): void;
  onSaveNow(): void;
  onToggleRail(): void;
  onTogglePanel(): void;
};

function SaveIndicator({ save, onSaveNow }: { save: SaveState; onSaveNow(): void }) {
  switch (save.status) {
    case "clean":
      return (
        <span className="save save--clean" title="Everything is on disk">
          <span className="save__dot" />
          {save.savedAt ? `Saved ${formatClock(save.savedAt)}` : "Saved"}
        </span>
      );
    case "pending":
      return (
        <span className="save save--pending">
          <span className="save__dot" />
          Edited
        </span>
      );
    case "saving":
      return (
        <span className="save save--saving">
          <span className="save__dot" />
          Saving…
        </span>
      );
    case "offline":
      return (
        <button
          type="button"
          className="save save--offline"
          onClick={onSaveNow}
          title="The writer's server isn't answering. Your work is kept in this browser and saves when it's back. Click to retry."
        >
          <span className="save__dot" />
          Offline: kept locally
        </button>
      );
    case "error":
      return (
        <button type="button" className="save save--error" onClick={onSaveNow} title={`${save.message} Click to retry.`}>
          <Icon name="alert" size={13} />
          Not saved: {save.message}
        </button>
      );
  }
}

export function TopBar({
  current,
  save,
  words,
  mode,
  uploads,
  railOpen,
  panelOpen,
  onMode,
  onSaveNow,
  onToggleRail,
  onTogglePanel,
}: Props) {
  const totalBytes = uploads.reduce((sum, item) => sum + item.total, 0);
  const loadedBytes = uploads.reduce((sum, item) => sum + item.loaded, 0);
  const percent = totalBytes > 0 ? Math.round((loadedBytes / totalBytes) * 100) : 0;

  return (
    <header className="topbar">
      <div className="topbar__left">
        {!railOpen ? (
          <button type="button" className="icon-button" onClick={onToggleRail} aria-label="Show drafts" title="Show drafts (⌘\)">
            <Icon name="railLeft" />
          </button>
        ) : null}
        {current ? (
          <p className="crumbs">
            <span>{KIND_LABEL[current.kind].many}</span>
            <Icon name="chevronRight" size={12} />
            <span className="mono crumbs__slug">{current.slug}</span>
          </p>
        ) : null}
      </div>

      {current ? (
        <div className="topbar__right">
          {uploads.length > 0 ? (
            <span className="upload-status" role="status">
              <span className="upload-status__bar" style={{ ["--progress" as string]: `${percent}%` }} />
              Uploading {uploads.length === 1 ? uploads[0].name : plural(uploads.length, "file")} · {percent}%
            </span>
          ) : null}
          {save ? <SaveIndicator save={save} onSaveNow={onSaveNow} /> : null}
          {words !== null ? (
            <span className="topbar__stat" title={`${words.toLocaleString("en-US")} words at 200 a minute`}>
              {plural(words, "word")}
              {/* The page floors reading time at 1 min; on an empty draft that reads oddly. */}
              {words > 0 ? (
                <>
                  <span aria-hidden="true"> · </span>
                  {readingMinutes(words)} min
                </>
              ) : null}
            </span>
          ) : null}

          <div className="mode-toggle" role="radiogroup" aria-label="Mode">
            <button
              type="button"
              role="radio"
              aria-checked={mode === "write"}
              className="mode-toggle__option"
              onClick={() => onMode("write")}
              title="Write (⌘⇧P toggles)"
            >
              <Icon name="pen" size={13} />
              Write
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "preview"}
              className="mode-toggle__option"
              onClick={() => onMode("preview")}
              title="Preview as the site renders it (⌘⇧P toggles)"
            >
              <Icon name="eye" size={13} />
              Preview
            </button>
          </div>

          <button
            type="button"
            className={`icon-button${panelOpen ? " is-on" : ""}`}
            onClick={onTogglePanel}
            aria-label={panelOpen ? "Hide details" : "Show details"}
            aria-pressed={panelOpen}
            title="Details, outline, figures, checks (⌘.)"
          >
            <Icon name="railRight" />
          </button>
        </div>
      ) : null}
    </header>
  );
}
