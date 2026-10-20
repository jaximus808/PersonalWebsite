// A modal on the native <dialog> element: it traps focus, closes on Esc and
// restores focus for free. A click on the backdrop closes it too.

import { useEffect, useId, useRef, type ReactNode } from "react";

import { Icon } from "./Icon";

type DialogProps = {
  open: boolean;
  onClose(): void;
  title: string;
  /** A line under the title. */
  lede?: ReactNode;
  children: ReactNode;
  /** "narrow" for confirmations. */
  size?: "narrow" | "normal" | "wide";
  /** Prevent closing (while a request is running). */
  busy?: boolean;
};

export function Dialog({ open, onClose, title, lede, children, size = "normal", busy = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal focuses the first focusable (the close button); prefer the
      // control the dialog is about.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busyRef.current) onClose();
      }}
      onMouseDown={(event) => {
        // The dialog element itself is only hit on its backdrop.
        if (event.target === event.currentTarget && !busyRef.current) onClose();
      }}
    >
      {open && (
        <div className="dialog__body">
          <header className="dialog__head">
            <div>
              <h2 id={titleId} className="dialog__title">
                {title}
              </h2>
              {lede ? <p className="dialog__lede">{lede}</p> : null}
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
            >
              <Icon name="close" />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}

type ConfirmProps = {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm(): void;
  onCancel(): void;
};

/** In-app confirmation (never window.confirm). */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} size="narrow" busy={busy}>
      <div className="dialog__text">{body}</div>
      <div className="dialog__actions">
        <button type="button" className="button button--quiet" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`button ${tone === "danger" ? "button--danger" : "button--primary"}`}
          onClick={onConfirm}
          disabled={busy}
          data-autofocus
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
