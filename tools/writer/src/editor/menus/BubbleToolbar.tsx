// The formatting bubble over selected text: bold, italic, strike, code,
// link, H2, H3, quote. The same bubble shows a link's address when the
// cursor sits in one, and turns into the link field for Cmd+K.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { NodeSelection, PluginKey, type EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

import { NODE } from "../../shared/types";
import {
  IconBold,
  IconCheck,
  IconCode,
  IconExternal,
  IconItalic,
  IconLink,
  IconQuote,
  IconStrike,
  IconUnlink,
} from "../icons";
import { shortcutLabel } from "../keys";
import { normalizeHref } from "../media";
import { cx, ToolButton, ToolDivider } from "../nodes/ui";

type Mode = "format" | "link";

function inCode(state: EditorState): boolean {
  const { $from, $to } = state.selection;
  return !!$from.parent.type.spec.code || !!$to.parent.type.spec.code;
}

export function BubbleToolbar({ editor }: { editor: Editor }) {
  const pluginKey = useMemo(() => new PluginKey("writerBubble"), []);
  const menu = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("format");
  const linkOpen = useRef(false);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      href: (e.getAttributes("link").href as string | undefined) ?? "",
      h2: e.isActive(NODE.heading, { level: 2 }),
      h3: e.isActive(NODE.heading, { level: 3 }),
      quote: e.isActive(NODE.blockquote),
      empty: e.state.selection.empty,
    }),
  });

  const openLink = useCallback(() => {
    if (!editor.isEditable) return false;
    if (editor.state.selection instanceof NodeSelection) return false;
    if (editor.state.selection.empty && editor.isActive("link")) {
      editor.chain().extendMarkRange("link").run();
    }
    linkOpen.current = true;
    setMode("link");
    editor.view.dispatch(editor.state.tr.setMeta(pluginKey, "show"));
    return true;
  }, [editor, pluginKey]);

  const closeLink = useCallback(
    (refocus: boolean) => {
      if (!linkOpen.current) return;
      linkOpen.current = false;
      setMode("format");
      if (refocus) editor.commands.focus();
      // Nothing about the selection changed, so the bubble won't re-check on
      // its own; hide it if plain formatting has nothing to act on.
      requestAnimationFrame(() => {
        if (editor.isDestroyed) return;
        const { selection, doc } = editor.state;
        const keep = selection.empty
          ? editor.isActive("link")
          : doc.textBetween(selection.from, selection.to, " ").trim().length > 0;
        if (!keep) editor.view.dispatch(editor.state.tr.setMeta(pluginKey, "hide"));
      });
    },
    [editor, pluginKey],
  );

  // Clicking back into the text while the link field is open cancels it.
  useEffect(() => {
    const onFocus = () => closeLink(false);
    editor.on("focus", onFocus);
    return () => {
      editor.off("focus", onFocus);
    };
  }, [editor, closeLink]);

  useEffect(() => {
    editor.storage.writerUi.openLink = openLink;
    return () => {
      if (editor.storage.writerUi?.openLink === openLink) editor.storage.writerUi.openLink = null;
    };
  }, [editor, openLink]);

  const shouldShow = useCallback(
    ({ editor: e, view, state: s, from, to }: { editor: Editor; view: EditorView; state: EditorState; from: number; to: number }) => {
      if (!e.isEditable) return false;
      if (linkOpen.current) return true;
      const { selection } = s;
      if (selection instanceof NodeSelection || inCode(s)) return false;
      const focused = view.hasFocus() || !!menu.current?.contains(document.activeElement);
      if (!focused) return false;
      if (selection.empty) return e.isActive("link");
      return s.doc.textBetween(from, to, " ").trim().length > 0;
    },
    [],
  );

  const options = useMemo(
    () => ({
      placement: "top" as const,
      offset: 10,
      flip: { padding: 12 },
      shift: { padding: 12 },
      onHide: () => {
        if (linkOpen.current) closeLink(false);
      },
    }),
    [closeLink],
  );

  const showPreview = mode === "format" && state.empty && state.link;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey={pluginKey}
      updateDelay={120}
      shouldShow={shouldShow}
      options={options}
      ref={menu}
      className="wr-bubble"
    >
      {mode === "link" ? (
        <LinkField
          initial={state.href}
          hasLink={state.link}
          onApply={(raw) => {
            const href = normalizeHref(raw);
            const chain = editor.chain().focus();
            if (!href) {
              chain.extendMarkRange("link").unsetLink().run();
            } else if (editor.state.selection.empty && !editor.isActive("link")) {
              chain.insertContent({ type: "text", text: raw.trim(), marks: [{ type: "link", attrs: { href } }] }).run();
            } else {
              chain.extendMarkRange("link").setLink({ href }).run();
            }
            closeLink(false);
          }}
          onRemove={() => {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            closeLink(false);
          }}
          onCancel={() => closeLink(true)}
        />
      ) : showPreview ? (
        <div className="wr-bubble__row" role="toolbar" aria-label="Link">
          <a className="wr-bubble__href" href={state.href} target="_blank" rel="noreferrer" title={state.href}>
            <IconExternal size={14} />
            <span>{state.href.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
          </a>
          <ToolDivider />
          <ToolButton label="Edit link" shortcut={shortcutLabel("Mod-k")} onClick={openLink}>
            <IconLink />
          </ToolButton>
          <ToolButton label="Remove link" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}>
            <IconUnlink />
          </ToolButton>
        </div>
      ) : (
        <div className="wr-bubble__row" role="toolbar" aria-label="Formatting">
          <ToolButton label="Bold" shortcut={shortcutLabel("Mod-b")} pressed={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
            <IconBold />
          </ToolButton>
          <ToolButton label="Italic" shortcut={shortcutLabel("Mod-i")} pressed={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <IconItalic />
          </ToolButton>
          <ToolButton label="Strikethrough" shortcut={shortcutLabel("Mod-Shift-s")} pressed={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
            <IconStrike />
          </ToolButton>
          <ToolButton label="Inline code" shortcut={shortcutLabel("Mod-e")} pressed={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
            <IconCode />
          </ToolButton>
          <ToolButton label="Link" shortcut={shortcutLabel("Mod-k")} pressed={state.link} onClick={openLink}>
            <IconLink />
          </ToolButton>
          <ToolDivider />
          <ToolButton label="Heading 2" shortcut={shortcutLabel("Mod-Alt-2")} pressed={state.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <span className="wr-glyph">H2</span>
          </ToolButton>
          <ToolButton label="Heading 3" shortcut={shortcutLabel("Mod-Alt-3")} pressed={state.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <span className="wr-glyph">H3</span>
          </ToolButton>
          <ToolButton label="Quote" shortcut={shortcutLabel("Mod-Shift-b")} pressed={state.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <IconQuote />
          </ToolButton>
        </div>
      )}
    </BubbleMenu>
  );
}

function LinkField({
  initial,
  hasLink,
  onApply,
  onRemove,
  onCancel,
}: {
  initial: string;
  hasLink: boolean;
  onApply(value: string): void;
  onRemove(): void;
  onCancel(): void;
}) {
  const [value, setValue] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Wait for the bubble to be placed before taking focus.
    const frame = requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <form
      className="wr-bubble__row wr-link-field"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(value);
      }}
    >
      <IconLink size={14} className="wr-link-field__icon" />
      <input
        ref={input}
        className="wr-link-field__input"
        type="text"
        inputMode="url"
        placeholder="Paste or type a link"
        aria-label="Link address"
        value={value}
        spellCheck={false}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      />
      <button type="submit" className={cx("wr-tool")} aria-label="Apply link" title="Apply  ↵">
        <IconCheck />
      </button>
      {hasLink ? (
        <button type="button" className="wr-tool is-danger" aria-label="Remove link" title="Remove link" onClick={onRemove}>
          <IconUnlink />
        </button>
      ) : null}
    </form>
  );
}
