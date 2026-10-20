// Small pieces shared by the custom block views: text fields bound to node
// attributes, toolbar buttons, the media frame, a file picker, and the moves
// that take the cursor out of a block.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { Editor } from "@tiptap/react";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";

import type { Fit, Ratio } from "../../shared/types";

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Attribute-bound fields.
//
// A node view's attributes arrive through ProseMirror, a beat after the
// keystroke that changed them. Binding an input straight to them makes the
// caret jump, so each field keeps its own text while focused, writes every
// change through at once, and only takes the node's value when it isn't
// being edited (undo, another view, a paste elsewhere).

interface FieldProps {
  value: string;
  onCommit(value: string): void;
  placeholder?: string;
  className?: string;
  label: string;
  /** Enter (without Shift for textareas). Return true if handled. */
  onEnter?(): boolean | void;
  onEscape?(): void;
  /** Called on ArrowUp at the very start / ArrowDown at the very end. */
  onExitUp?(): void;
  onExitDown?(): void;
  maxLength?: number;
  spellCheck?: boolean;
  /** Size the input to its text (for inline labels). */
  autoSize?: boolean;
}

export interface FieldHandle {
  focus(): void;
}

function useBoundText(value: string, onCommit: (value: string) => void) {
  const [text, setText] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);
  const change = useCallback(
    (next: string) => {
      setText(next);
      onCommit(next);
    },
    [onCommit],
  );
  const bind = {
    onFocus: () => {
      focused.current = true;
    },
    onBlur: () => {
      focused.current = false;
      // Catch up with anything that changed the attribute meanwhile.
      setText(value);
    },
  };
  return { text, change, bind };
}

function handleFieldKeys(
  event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  props: FieldProps,
  multiline: boolean,
) {
  const el = event.currentTarget;
  if (event.key === "Enter" && !event.nativeEvent.isComposing && (!multiline || !event.shiftKey)) {
    if (props.onEnter && props.onEnter() !== false) {
      event.preventDefault();
    }
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    props.onEscape?.();
    return;
  }
  const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
  const atEnd = el.selectionStart === el.value.length && el.selectionEnd === el.value.length;
  if (event.key === "ArrowUp" && atStart && props.onExitUp) {
    event.preventDefault();
    props.onExitUp();
  } else if (event.key === "ArrowDown" && atEnd && props.onExitDown) {
    event.preventDefault();
    props.onExitDown();
  }
}

export const AttrInput = forwardRef<FieldHandle, FieldProps>(function AttrInput(props, ref) {
  const { text, change, bind } = useBoundText(props.value, props.onCommit);
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }), []);
  return (
    <input
      ref={input}
      type="text"
      className={props.className}
      value={text}
      placeholder={props.placeholder}
      aria-label={props.label}
      maxLength={props.maxLength}
      spellCheck={props.spellCheck ?? true}
      size={props.autoSize ? Math.max(text.length, props.placeholder?.length ?? 4, 4) : undefined}
      onChange={(event: ChangeEvent<HTMLInputElement>) => change(event.target.value)}
      onKeyDown={(event) => handleFieldKeys(event, props, false)}
      {...bind}
    />
  );
});

/** A textarea that grows with its text. */
export const AttrTextarea = forwardRef<FieldHandle, FieldProps & { minRows?: number }>(
  function AttrTextarea(props, ref) {
    const { text, change, bind } = useBoundText(props.value, props.onCommit);
    const area = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => ({ focus: () => area.current?.focus() }), []);
    useLayoutEffect(() => {
      const el = area.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [text]);
    return (
      <textarea
        ref={area}
        className={props.className}
        value={text}
        rows={props.minRows ?? 2}
        placeholder={props.placeholder}
        aria-label={props.label}
        spellCheck={props.spellCheck ?? true}
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => handleFieldKeys(event, props, true)}
        {...bind}
      />
    );
  },
);

// ---------------------------------------------------------------------------
// Toolbars.

export function NodeToolbar({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("wr-node-toolbar", className)} role="toolbar" aria-label={label} contentEditable={false}>
      {children}
    </div>
  );
}

interface ToolButtonProps {
  label: string;
  onClick(): void;
  children: ReactNode;
  pressed?: boolean;
  danger?: boolean;
  disabled?: boolean;
  /** Show the label text next to the icon. */
  showLabel?: boolean;
  shortcut?: string;
}

export function ToolButton({ label, onClick, children, pressed, danger, disabled, showLabel, shortcut }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={cx("wr-tool", pressed && "is-active", danger && "is-danger", showLabel && "has-label")}
      aria-label={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      title={shortcut ? `${label}  ${shortcut}` : label}
      disabled={disabled}
      // Keep the editor's selection where it is.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
      {showLabel ? <span className="wr-tool__label">{label}</span> : null}
    </button>
  );
}

export function ToolDivider() {
  return <span className="wr-tool-divider" aria-hidden="true" />;
}

/** A row of mutually exclusive choices (ratio, fit, columns). */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange(value: T): void;
}) {
  return (
    <div className="wr-segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          title={option.title ?? option.label}
          className={cx("wr-segmented__item", option.value === value && "is-active")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The media frame, as components/content/Frame.tsx draws it on the site.

export const RATIOS: Record<Ratio, string> = {
  wide: "16 / 9",
  standard: "3 / 2",
  square: "1 / 1",
  tall: "4 / 5",
};

export const RATIO_OPTIONS: { value: Ratio; label: string; title: string }[] = [
  { value: "standard", label: "3:2", title: "Standard 3:2" },
  { value: "wide", label: "16:9", title: "Wide 16:9" },
  { value: "square", label: "1:1", title: "Square" },
  { value: "tall", label: "4:5", title: "Tall 4:5" },
];

export function Frame({ ratio, children, className }: { ratio: Ratio; children: ReactNode; className?: string }) {
  return (
    <div className={cx("wr-frame", className)} style={{ aspectRatio: RATIOS[ratio] ?? RATIOS.standard }}>
      {children}
    </div>
  );
}

export function FramedImage({ src, alt, ratio, fit }: { src: string; alt: string; ratio: Ratio; fit: Fit }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <Frame ratio={ratio}>
      {failed ? (
        <div className="wr-frame__missing">
          <span>Image not found</span>
          <code>{src}</code>
        </div>
      ) : (
        <>
          {fit !== "cover" ? <img src={src} alt="" aria-hidden="true" className="wr-frame__fill" draggable={false} /> : null}
          <img
            src={src}
            alt={alt}
            className={cx("wr-frame__img", fit === "cover" ? "is-cover" : "is-contain")}
            draggable={false}
            onError={() => setFailed(true)}
          />
        </>
      )}
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// File picking.

/** Returns a function that opens the system file dialog. */
export function useFilePicker(options: { accept: string; multiple?: boolean; onFiles(files: File[]): void }) {
  const latest = useRef(options);
  latest.current = options;
  return useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = latest.current.accept;
    input.multiple = !!latest.current.multiple;
    input.addEventListener("change", () => {
      const files = Array.from(input.files ?? []);
      if (files.length) latest.current.onFiles(files);
    });
    input.click();
  }, []);
}

/** True while files are dragged over the element (for drop-zone styling). */
export function useFileDragOver() {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer.types).includes("Files");
  return {
    over,
    reset: () => {
      depth.current = 0;
      setOver(false);
    },
    handlers: {
      onDragEnter: (event: DragEvent) => {
        if (!hasFiles(event)) return;
        depth.current += 1;
        setOver(true);
      },
      onDragLeave: (event: DragEvent) => {
        if (!hasFiles(event)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      },
      onDragOver: (event: DragEvent) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      },
    },
  };
}

/** Whether focus is anywhere inside the element (a field, a toolbar button). */
export function useFocusWithin() {
  const [inside, setInside] = useState(false);
  return {
    inside,
    handlers: {
      onFocus: () => setInside(true),
      onBlur: (event: FocusEvent<HTMLElement>) => {
        const next = event.relatedTarget;
        if (!(next instanceof Element) || !event.currentTarget.contains(next)) setInside(false);
      },
    },
  };
}

/** Files carried by a drop event, if any. */
export function droppedFiles(event: DragEvent): File[] {
  return Array.from(event.dataTransfer?.files ?? []);
}

// ---------------------------------------------------------------------------
// Motion preference.

export function usePrefersReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

// ---------------------------------------------------------------------------
// Leaving a block from one of its fields.

/** Put the cursor in the text block after the node, creating one if needed. */
export function focusAfterNode(editor: Editor, getPos: () => number | undefined) {
  const pos = getPos();
  if (pos == null) return;
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const after = pos + node.nodeSize;
  const next = editor.state.doc.resolve(after).nodeAfter;
  if (next?.isTextblock) {
    editor.chain().focus().setTextSelection(after + 1).scrollIntoView().run();
    return;
  }
  editor
    .chain()
    .focus()
    .insertContentAt(after, { type: "paragraph" })
    .setTextSelection(after + 1)
    .scrollIntoView()
    .run();
}

/** Put the cursor at the end of whatever comes before the node. */
export function focusBeforeNode(editor: Editor, getPos: () => number | undefined) {
  const pos = getPos();
  if (pos == null) return;
  const $pos = editor.state.doc.resolve(pos);
  const selection = TextSelection.findFrom($pos, -1, true);
  if (selection) {
    editor.chain().focus().setTextSelection(selection.from).scrollIntoView().run();
  } else {
    selectNode(editor, getPos);
  }
}

/** Select the node itself, so Backspace deletes it and the toolbar shows. */
export function selectNode(editor: Editor, getPos: () => number | undefined) {
  const pos = getPos();
  if (pos == null) return;
  const { tr } = editor.state;
  editor.view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, pos)));
  editor.view.focus();
}
