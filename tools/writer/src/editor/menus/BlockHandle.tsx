// The handle in the left margin of the block under the pointer: "+" opens
// the block menu on a new line below, the grip drags the block to a new
// place, and clicking the grip opens a menu (turn into, duplicate, move,
// delete).

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { offset } from "@floating-ui/dom";

import { NODE } from "../../shared/types";
import { deleteBlockAt, duplicateBlockAt, moveBlockAt, turnTextBlockInto, type TurnInto } from "../blocks";
import {
  IconArrowDown,
  IconArrowUp,
  IconCallout,
  IconCodeBlock,
  IconDuplicate,
  IconGrip,
  IconPlus,
  IconPullQuote,
  IconQuote,
  IconText,
  IconTrash,
} from "../icons";
import { shortcutLabel } from "../keys";
import { MenuItem, MenuSection, Popover } from "./Popover";

interface Target {
  node: PMNode;
  pos: number;
}

const TURN_INTO: { kind: TurnInto; label: string; icon: ReactNode }[] = [
  { kind: "paragraph", label: "Text", icon: <IconText /> },
  { kind: "h2", label: "Heading 2", icon: <span className="wr-glyph">H2</span> },
  { kind: "h3", label: "Heading 3", icon: <span className="wr-glyph">H3</span> },
  { kind: "h4", label: "Heading 4", icon: <span className="wr-glyph">H4</span> },
  { kind: "quote", label: "Quote", icon: <IconQuote /> },
  { kind: "pullQuote", label: "Pull quote", icon: <IconPullQuote /> },
  { kind: "callout", label: "Callout", icon: <IconCallout /> },
  { kind: "code", label: "Code", icon: <IconCodeBlock /> },
];

function lock(editor: Editor, locked: boolean) {
  if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta("lockDragHandle", locked));
}

/** Height of the block's first line, so the handle sits level with it. */
function firstLineHeight(editor: Editor, pos: number): number {
  const dom = editor.view.nodeDOM(pos);
  if (!(dom instanceof HTMLElement)) return 0;
  const line = dom.matches("p, h2, h3, h4, li") ? dom : dom.querySelector<HTMLElement>("p, h2, h3, h4");
  if (!line) return 0;
  const style = getComputedStyle(line);
  const height = parseFloat(style.lineHeight);
  return Number.isFinite(height) ? height : parseFloat(style.fontSize) * 1.6;
}

export function BlockHandle({ editor }: { editor: Editor }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const grip = useRef<HTMLButtonElement>(null);
  const lineHeight = useRef(0);
  const open = useRef(false);

  const computePositionConfig = useMemo(
    () => ({
      placement: "left-start" as const,
      strategy: "absolute" as const,
      middleware: [
        offset(({ rects }) => ({
          mainAxis: 10,
          crossAxis: Math.max(0, (lineHeight.current - rects.floating.height) / 2),
        })),
      ],
    }),
    [],
  );

  const onNodeChange = useCallback(
    ({ node, pos }: { node: PMNode | null; pos: number }) => {
      if (open.current) return;
      if (node && pos >= 0) {
        lineHeight.current = firstLineHeight(editor, pos);
        setTarget({ node, pos });
      } else {
        setTarget(null);
      }
    },
    [editor],
  );

  const closeMenu = useCallback(
    (refocus = true) => {
      open.current = false;
      setMenuOpen(false);
      lock(editor, false);
      if (refocus) editor.commands.focus();
    },
    [editor],
  );

  const current = (): Target | null => {
    if (!target) return null;
    // The doc may have changed since hover; re-read the node at that spot.
    const node = editor.state.doc.nodeAt(target.pos);
    return node ? { node, pos: target.pos } : null;
  };

  const addBelow = () => {
    const at = current();
    if (!at) return;
    const { node, pos } = at;
    if (node.type.name === NODE.paragraph && node.content.size === 0) {
      editor.chain().focus().setTextSelection(pos + 1).insertContent("/").run();
      return;
    }
    const after = pos + node.nodeSize;
    editor
      .chain()
      .focus()
      .insertContentAt(after, { type: NODE.paragraph })
      .setTextSelection(after + 1)
      .insertContent("/")
      .scrollIntoView()
      .run();
  };

  const openMenu = () => {
    if (!current()) return;
    open.current = true;
    lock(editor, true);
    setMenuOpen(true);
  };

  const at = menuOpen ? current() : null;
  const doc = editor.state.doc;
  const index = at ? doc.resolve(at.pos).index() : 0;
  const siblings = at ? doc.resolve(at.pos).parent.childCount : 0;
  const textBlock = !!at?.node.isTextblock;

  return (
    <>
      <DragHandle editor={editor} className="wr-handle" computePositionConfig={computePositionConfig} onNodeChange={onNodeChange}>
        <div className="wr-handle__inner">
          <button
            type="button"
            className="wr-handle__button"
            aria-label="Add a block below"
            title="Add a block below"
            onClick={addBelow}
          >
            <IconPlus size={15} />
          </button>
          <button
            ref={grip}
            type="button"
            className="wr-handle__button wr-handle__grip"
            aria-label="Block options (drag to move)"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="Drag to move · click for options"
            onClick={openMenu}
          >
            <IconGrip size={15} />
          </button>
        </div>
      </DragHandle>

      {menuOpen && at ? (
        <Popover anchor={grip.current} onClose={() => closeMenu()} label="Block options" placement="left-start">
          {textBlock ? (
            <MenuSection label="Turn into">
              {TURN_INTO.map((option) => (
                <MenuItem
                  key={option.kind}
                  icon={option.icon}
                  label={option.label}
                  onSelect={() => {
                    closeMenu(false);
                    turnTextBlockInto(editor, at.pos, option.kind);
                  }}
                />
              ))}
            </MenuSection>
          ) : null}
          <MenuSection>
            <MenuItem
              icon={<IconDuplicate />}
              label="Duplicate"
              onSelect={() => {
                closeMenu(false);
                duplicateBlockAt(editor, at.pos);
              }}
            />
            <MenuItem
              icon={<IconArrowUp />}
              label="Move up"
              hint={shortcutLabel("Mod-Shift-ArrowUp")}
              disabled={index === 0}
              onSelect={() => {
                closeMenu(false);
                moveBlockAt(editor, at.pos, -1);
                editor.commands.focus();
              }}
            />
            <MenuItem
              icon={<IconArrowDown />}
              label="Move down"
              hint={shortcutLabel("Mod-Shift-ArrowDown")}
              disabled={index >= siblings - 1}
              onSelect={() => {
                closeMenu(false);
                moveBlockAt(editor, at.pos, 1);
                editor.commands.focus();
              }}
            />
            <MenuItem
              icon={<IconTrash />}
              label="Delete"
              danger
              onSelect={() => {
                closeMenu(false);
                deleteBlockAt(editor, at.pos);
              }}
            />
          </MenuSection>
        </Popover>
      ) : null}
    </>
  );
}
