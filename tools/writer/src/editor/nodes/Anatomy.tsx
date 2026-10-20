// anatomy: a request for an Anatomy figure (an interactive isometric
// drawing Claude builds with the anatomy skill). Until it is built the card
// holds the brief; once figures/<id>.html exists it shows the figure live.
// Becomes <Diagram src="/<kind>/<slug>/figures/<id>.html" title caption size />.

import { useEffect, useRef, useState } from "react";
import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";

import { NODE, type AnatomyAttrs, type FigureSize } from "../../shared/types";
import { useFigureFrame } from "../../shared/useFigureFrame";
import { insertBlockNode } from "../blocks";
import { buildFiguresPhrase, figureUrl, useEditorEnv } from "../env";
import { IconAnatomy, IconCheck, IconChevronDown, IconCopy, IconReload, IconTrash } from "../icons";
import { nextFigureId } from "../plugins/anatomyIds";
import { dataAttr, oneOf, text } from "./attrs";
import {
  AttrInput,
  AttrTextarea,
  cx,
  focusAfterNode,
  focusBeforeNode,
  NodeToolbar,
  Segmented,
  selectNode,
  ToolButton,
  useFocusWithin,
  type FieldHandle,
} from "./ui";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    anatomy: {
      /** Insert a figure request with the next free id ("fig-3"). */
      insertAnatomy: (attrs?: Partial<Omit<AnatomyAttrs, "id">>) => ReturnType;
    };
  }
  interface Storage {
    anatomy: AnatomyStorage;
  }
}

export interface AnatomyStorage {
  /** Every id seen this session (in the doc, from the server, or deleted since). */
  seen: Set<string>;
  /** Ids just inserted from a menu; their card focuses its title once. */
  focusOnMount: Set<string>;
}

const SIZES: FigureSize[] = ["figure", "hero"];

export const Anatomy = TiptapNode.create<Record<string, never>, AnatomyStorage>({
  name: NODE.anatomy,
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addStorage() {
    return { seen: new Set<string>(), focusOnMount: new Set<string>() };
  },

  addAttributes() {
    return {
      id: dataAttr("id", "", text),
      title: dataAttr("title", "", text),
      prompt: dataAttr("prompt", "", text),
      caption: dataAttr("caption", "", text),
      size: dataAttr<FigureSize>("size", "figure", oneOf(SIZES, "figure")),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="anatomy"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { title, prompt } = node.attrs as AnatomyAttrs;
    return [
      "div",
      mergeAttributes({ "data-type": "anatomy" }, HTMLAttributes),
      ["strong", {}, title || "Anatomy figure"],
      ["p", {}, prompt],
    ];
  },

  addCommands() {
    return {
      insertAnatomy:
        (attrs = {}) =>
        ({ tr, dispatch }) => {
          if (!dispatch) return true;
          const id = nextFigureId(this.storage.seen);
          this.storage.seen.add(id);
          this.storage.focusOnMount.add(id);
          insertBlockNode(tr, this.type.create({ ...attrs, id }), true);
          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(AnatomyView);
  },
});

function AnatomyView({ node, updateAttributes, deleteNode, selected, editor, getPos, extension }: ReactNodeViewProps) {
  const env = useEditorEnv();
  const attrs = node.attrs as AnatomyAttrs;
  const storage = extension.storage as AnatomyStorage;
  const focus = useFocusWithin();
  const title = useRef<FieldHandle>(null);
  const prompt = useRef<FieldHandle>(null);
  const caption = useRef<FieldHandle>(null);
  const built = env.figures.some((figure) => figure.id === attrs.id && figure.built);
  const [briefOpen, setBriefOpen] = useState(!built);
  const [reload, setReload] = useState(0);
  const [copied, setCopied] = useState(false);
  const active = selected || focus.inside;

  // A request that just got built: show the figure, fold the brief away,
  // and load a fresh copy rather than a cached 404.
  const wasBuilt = useRef(built);
  useEffect(() => {
    if (built && !wasBuilt.current) {
      setBriefOpen(false);
      setReload((n) => n + 1);
    }
    if (!built && wasBuilt.current) setBriefOpen(true);
    wasBuilt.current = built;
  }, [built]);

  useEffect(() => {
    if (storage.focusOnMount.delete(attrs.id)) {
      requestAnimationFrame(() => title.current?.focus());
    }
  }, [attrs.id, storage]);

  const copyPhrase = async () => {
    try {
      await navigator.clipboard.writeText(buildFiguresPhrase(env.slug));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      env.notify("Couldn't reach the clipboard.", "error");
    }
  };

  return (
    <NodeViewWrapper
      className={cx(
        "wr-block wr-anatomy",
        built ? "is-built" : "is-requested",
        attrs.size === "hero" && "is-hero",
        active && "is-active",
        selected && "is-selected",
      )}
      {...focus.handlers}
    >
      <div className="wr-anatomy__head" contentEditable={false}>
        <span className="wr-anatomy__eyebrow">
          <IconAnatomy size={14} />
          Anatomy figure
          <code className="wr-anatomy__id" title="Figure id: names figures/<id>.html">
            {attrs.id || "…"}
          </code>
        </span>
        <span className={cx("wr-status", built ? "is-built" : "is-requested")}>
          {built ? "Built" : "Requested"}
        </span>
        <NodeToolbar label="Figure request" className={cx("wr-anatomy__tools", active && "is-visible")}>
          <Segmented
            label="Size"
            value={attrs.size}
            options={[
              { value: "figure", label: "Text width", title: "As wide as the text" },
              { value: "hero", label: "Hero", title: "A little wider than the text" },
            ]}
            onChange={(size) => updateAttributes({ size })}
          />
          {built ? (
            <ToolButton label="Reload figure" onClick={() => setReload((n) => n + 1)}>
              <IconReload />
            </ToolButton>
          ) : null}
          <ToolButton label="Delete figure request" danger onClick={deleteNode}>
            <IconTrash />
          </ToolButton>
        </NodeToolbar>
      </div>

      {built ? <FigureFrame src={`${figureUrl(env.kind, env.slug, attrs.id)}?v=${reload}`} title={attrs.title} /> : null}

      <div className="wr-anatomy__fields" contentEditable={false}>
        <AttrInput
          ref={title}
          className="wr-anatomy__title"
          label="Figure title"
          placeholder="Title of the figure"
          value={attrs.title}
          onCommit={(value) => updateAttributes({ title: value })}
          onEnter={() => (briefOpen ? prompt.current?.focus() : caption.current?.focus())}
          onEscape={() => selectNode(editor, getPos)}
          onExitUp={() => focusBeforeNode(editor, getPos)}
          onExitDown={() => (briefOpen ? prompt.current?.focus() : caption.current?.focus())}
        />

        {built ? (
          <button
            type="button"
            className={cx("wr-disclosure", briefOpen && "is-open")}
            aria-expanded={briefOpen}
            onClick={() => setBriefOpen((open) => !open)}
          >
            <IconChevronDown size={14} />
            The brief
          </button>
        ) : null}

        {briefOpen ? (
          <label className="wr-anatomy__brief">
            <span className="wr-anatomy__label">What should it show?</span>
            <AttrTextarea
              ref={prompt}
              className="wr-anatomy__prompt"
              label="What should the figure show?"
              placeholder="The object, its parts, what moves, what the reader should notice. Plain words are fine: Claude reads this when it builds the figure."
              value={attrs.prompt}
              minRows={3}
              onCommit={(value) => updateAttributes({ prompt: value })}
              onEscape={() => selectNode(editor, getPos)}
              onExitDown={() => caption.current?.focus()}
              onExitUp={() => title.current?.focus()}
            />
          </label>
        ) : null}

        <AttrInput
          ref={caption}
          className="wr-anatomy__caption"
          label="Figure caption"
          placeholder="Caption (optional)"
          value={attrs.caption}
          onCommit={(value) => updateAttributes({ caption: value })}
          onEnter={() => focusAfterNode(editor, getPos)}
          onEscape={() => selectNode(editor, getPos)}
          onExitDown={() => focusAfterNode(editor, getPos)}
          onExitUp={() => (briefOpen ? prompt.current?.focus() : title.current?.focus())}
        />
      </div>

      {!built ? (
        <div className="wr-anatomy__hint" contentEditable={false}>
          <span>When the brief is ready, ask Claude:</span>
          <button type="button" className="wr-phrase" onClick={copyPhrase} title="Copy">
            <span>“{buildFiguresPhrase(env.slug)}”</span>
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            <span className="wr-visually-hidden">{copied ? "Copied" : "Copy the phrase"}</span>
          </button>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

/**
 * The built figure in an iframe, sized to its document the way the site's
 * Diagram component does (same origin: the writer serves both).
 */
function FigureFrame({ src, title }: { src: string; title: string }) {
  const { ref, height, onLoad } = useFigureFrame(src);

  return (
    <div className="wr-anatomy__figure" contentEditable={false}>
      <iframe
        ref={ref}
        src={src}
        title={title || "Anatomy figure"}
        loading="lazy"
        onLoad={onLoad}
        style={height ? { height } : { aspectRatio: "16 / 10" }}
      />
    </div>
  );
}
