// Choosing a cover: upload or drop a file, paste one, reuse an image that's
// already in the draft, or point at a site path / URL.

import { useEffect, useRef, useState } from "react";

import type { UploadResult } from "../../shared/types";
import { errorMessage, isAbort } from "../api";
import { Dialog } from "../ui/Dialog";
import { Icon } from "../ui/Icon";

type Props = {
  open: boolean;
  current?: string;
  /** Images already in the doc, as the doc stores them. */
  images: string[];
  /** "Use a 16:9 image" for projects. */
  hint: string;
  resolveSrc(src: string): string;
  upload(file: File): Promise<UploadResult>;
  onPick(src: string): void;
  onClose(): void;
};

function imageFrom(list: FileList | DataTransferItemList | null | undefined): File | null {
  if (!list) return null;
  for (const item of Array.from(list as ArrayLike<File | DataTransferItem>)) {
    const file = item instanceof File ? item : item.kind === "file" ? item.getAsFile() : null;
    if (file && file.type.startsWith("image/")) return file;
  }
  return null;
}

export function CoverPicker({ open, current, images, hint, resolveSrc, upload, onPick, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setError(null);
    setPath(current && !current.startsWith("assets/") ? current : "");
    setDragging(false);
  }, [open, current]);

  const send = async (file: File | null) => {
    if (!file) {
      setError("That isn't an image.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await upload(file);
      onPick(result.src);
    } catch (err) {
      if (!isAbort(err)) setError(errorMessage(err));
      setBusy(false);
    }
  };

  // Cmd+V with an image on the clipboard uploads it.
  useEffect(() => {
    if (!open) return;
    const onPaste = (event: ClipboardEvent) => {
      const file = imageFrom(event.clipboardData?.items);
      if (file) {
        event.preventDefault();
        void send(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // send only closes over stable props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const usePath = () => {
    const value = path.trim();
    if (!value) return;
    if (!/^(https?:\/\/|\/blog\/|\/projects\/|assets\/)/i.test(value)) {
      setError("Use a site path (/blog/…, /projects/…), a draft asset (assets/…), or an http(s) URL.");
      return;
    }
    onPick(value);
  };

  return (
    <Dialog open={open} onClose={onClose} busy={busy} title="Cover image" lede={hint} size="wide">
      <div className="cover-picker">
        <div
          className={`dropzone${dragging ? " is-dragging" : ""}${busy ? " is-busy" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void send(imageFrom(event.dataTransfer.files));
          }}
        >
          <Icon name="upload" size={20} />
          <p>{busy ? "Uploading…" : "Drop an image here, paste one, or"}</p>
          <button
            type="button"
            className="button button--small"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            Choose a file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              void send(imageFrom(event.target.files));
              event.target.value = "";
            }}
          />
        </div>

        {images.length > 0 ? (
          <section>
            <h3 className="eyebrow">From this draft</h3>
            <ul className="cover-picker__grid">
              {images.map((src) => (
                <li key={src}>
                  <button
                    type="button"
                    className={`thumb${src === current ? " is-selected" : ""}`}
                    onClick={() => onPick(src)}
                    disabled={busy}
                    title={src}
                  >
                    <img src={resolveSrc(src)} alt="" loading="lazy" decoding="async" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <h3 className="eyebrow">Or a path</h3>
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              usePath();
            }}
          >
            <input
              className="input input--mono"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="/blog/some-post/cover.jpg or https://…"
              spellCheck={false}
            />
            <button type="submit" className="button button--small" disabled={!path.trim() || busy}>
              Use
            </button>
          </form>
        </section>

        {error ? <p className="form__error">{error}</p> : null}
      </div>
    </Dialog>
  );
}
