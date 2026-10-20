// A small anchored popover for menus opened from a button (the block
// handle's menu). Positioned with Floating UI, closed by Escape or a click
// outside, and keyboard navigable: arrow keys move between items, focus
// returns to the editor on close.

import { useEffect, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { autoUpdate, computePosition, flip, offset, shift, type Placement } from "@floating-ui/dom";

import { cx } from "../nodes/ui";

interface PopoverProps {
  anchor: HTMLElement | null;
  onClose(): void;
  label: string;
  placement?: Placement;
  className?: string;
  children: ReactNode;
}

const ITEM_SELECTOR = '[role="menuitem"]:not([disabled]), [role="menuitemradio"]:not([disabled])';

export function Popover({ anchor, onClose, label, placement = "bottom-start", className, children }: PopoverProps) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useLayoutEffect(() => {
    const el = panel.current;
    if (!anchor || !el) return;
    return autoUpdate(anchor, el, () => {
      void computePosition(anchor, el, {
        placement,
        strategy: "fixed",
        middleware: [offset(6), flip({ padding: 12 }), shift({ padding: 12 })],
      }).then(({ x, y }) => {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.opacity = "1";
      });
    });
  }, [anchor, placement]);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus({ preventScroll: true });
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (panel.current?.contains(target) || anchor?.contains(target)) return;
      close.current();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [anchor]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(panel.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    const at = items.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (event.key === "ArrowDown") next = (at + 1) % items.length;
    else if (event.key === "ArrowUp") next = (at - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      close.current();
      return;
    }
    if (next !== null && items.length) {
      event.preventDefault();
      items[next].focus();
    }
  };

  return createPortal(
    <div
      ref={panel}
      className={cx("wr-popover wr-menu", className)}
      role="menu"
      aria-label={label}
      // Transparent (not hidden) until placed, so focus can move in at once.
      style={{ position: "fixed", left: 0, top: 0, opacity: 0 }}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItem({
  icon,
  label,
  hint,
  onSelect,
  danger,
  disabled,
}: {
  icon?: ReactNode;
  label: string;
  hint?: string;
  onSelect(): void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cx("wr-menu__item", danger && "is-danger")}
      disabled={disabled}
      onClick={onSelect}
    >
      {icon ? <span className="wr-menu__icon">{icon}</span> : null}
      <span className="wr-menu__label">{label}</span>
      {hint ? <kbd className="wr-menu__hint">{hint}</kbd> : null}
    </button>
  );
}

export function MenuSection({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="wr-menu__section" role="group" aria-label={label}>
      {label ? <div className="wr-menu__heading">{label}</div> : null}
      {children}
    </div>
  );
}
