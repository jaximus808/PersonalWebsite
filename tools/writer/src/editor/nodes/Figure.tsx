// figure: one image in the site's frame, with a caption. Becomes
// <Figure src caption alt ratio fit /> (components/content/Figure.tsx).

import { useRef, useState, type DragEvent } from "react";
import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";

import { NODE, type Fit, type FigureAttrs, type Ratio } from "../../shared/types";
import { insertBlockNode } from "../blocks";
import { useEditorEnv } from "../env";
import { IconAlt, IconImage, IconReplace, IconTrash, IconUpload } from "../icons";
import { isStorableSrc, mediaKindOf, normalizeHref } from "../media";
import { dataAttr, oneOf, text } from "./attrs";
import {
  AttrInput,
  cx,
  focusAfterNode,
  FramedImage,
  NodeToolbar,
  RATIO_OPTIONS,
  Segmented,
  selectNode,
  ToolButton,
  ToolDivider,
  droppedFiles,
  useFileDragOver,
  useFilePicker,
  useFocusWithin,
  type FieldHandle,
} from "./ui";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figure: {
      /** Insert a figure (an empty one shows the upload state). */
      insertFigure: (attrs?: Partial<FigureAttrs>) => ReturnType;
    };
  }
}

const RATIO_VALUES: Ratio[] = ["standard", "wide", "square", "tall"];
const FIT_VALUES: Fit[] = ["contain", "cover"];

export const Figure = TiptapNode.create({
  name: NODE.figure,
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      src: dataAttr("src", "", text),
      caption: dataAttr("caption", "", text),
      alt: dataAttr("alt", "", text),
      ratio: dataAttr<Ratio>("ratio", "standard", oneOf(RATIO_VALUES, "standard")),
      fit: dataAttr<Fit>("fit", "contain", oneOf(FIT_VALUES, "contain")),
    };
  },

  parseHTML() {
    return [
      { tag: 'figure[data-type="figure"]' },
      {
        // A figure from another page: take its image and caption.
        tag: "figure",
        priority: 40,
        getAttrs: (element) => {
          const img = element.querySelector("img");
          const src = img?.getAttribute("src") ?? "";
          if (!isStorableSrc(src)) return false;
          return {
            src,
            alt: img?.getAttribute("alt") ?? "",
            caption: element.querySelector("figcaption")?.textContent?.trim() ?? "",
          };
        },
      },
      {
        // Any pasted <img>. data:/blob: images are skipped rather than
        // stuffing megabytes of base64 into the draft.
        tag: "img[src]",
        priority: 40,
        getAttrs: (element) => {
          const src = element.getAttribute("src") ?? "";
          if (!isStorableSrc(src)) return false;
          return { src, alt: element.getAttribute("alt") ?? "" };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, alt, caption } = node.attrs as FigureAttrs;
    return [
      "figure",
      mergeAttributes({ "data-type": "figure" }, HTMLAttributes),
      ["img", { src, alt }],
      ["figcaption", {}, caption],
    ];
  },

  addCommands() {
    return {
      insertFigure:
        (attrs = {}) =>
        ({ tr, dispatch }) => {
          if (dispatch) insertBlockNode(tr, this.type.create(attrs), true);
          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureView);
  },
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function FigureView({ node, updateAttributes, deleteNode, selected, editor, getPos }: ReactNodeViewProps) {
  const env = useEditorEnv();
  const attrs = node.attrs as FigureAttrs;
  const focus = useFocusWithin();
  const [altOpen, setAltOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const caption = useRef<FieldHandle>(null);
  const alt = useRef<FieldHandle>(null);
  const drag = useFileDragOver();
  const active = selected || focus.inside;

  async function place(file: File) {
    if (mediaKindOf(file) !== "image") {
      env.notify(`${file.name} isn't an image.`, "error");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    try {
      const result = await env.upload(file);
      updateAttributes({ src: result.src });
    } catch (error) {
      env.notify(`Couldn't upload ${file.name}: ${errorMessage(error)}`, "error");
    } finally {
      URL.revokeObjectURL(url);
      setPreview(null);
    }
  }

  const pick = useFilePicker({ accept: "image/*", onFiles: ([file]) => void place(file) });

  const shownSrc = preview ?? (attrs.src ? env.resolveSrc(attrs.src) : "");

  return (
    <NodeViewWrapper
      as="figure"
      className={cx("wr-block wr-figure", active && "is-active", selected && "is-selected", drag.over && "is-drop-target")}
      data-wr-dropzone=""
      {...focus.handlers}
      {...drag.handlers}
      onDrop={(event: DragEvent) => {
        drag.reset();
        const [file] = droppedFiles(event);
        if (!file) return;
        event.preventDefault();
        void place(file);
      }}
    >
      {shownSrc ? (
        <div className={cx("wr-media", preview && "is-uploading")}>
          <FramedImage src={shownSrc} alt={attrs.alt} ratio={attrs.ratio} fit={attrs.fit} />
          {preview ? <div className="wr-progress" aria-label="Uploading" /> : null}
          {active && !preview ? (
            <NodeToolbar label="Image" className="wr-media__toolbar">
              <Segmented
                label="Frame shape"
                value={attrs.ratio}
                options={RATIO_OPTIONS}
                onChange={(ratio) => updateAttributes({ ratio })}
              />
              <ToolDivider />
              <Segmented
                label="Fit"
                value={attrs.fit}
                options={[
                  { value: "contain", label: "Fit", title: "Show the whole image" },
                  { value: "cover", label: "Fill", title: "Crop to fill the frame" },
                ]}
                onChange={(fit) => updateAttributes({ fit })}
              />
              <ToolDivider />
              <ToolButton
                label="Alt text"
                pressed={altOpen || !!attrs.alt}
                onClick={() => {
                  setAltOpen((open) => !open);
                  requestAnimationFrame(() => alt.current?.focus());
                }}
              >
                <IconAlt />
              </ToolButton>
              <ToolButton label="Replace image" onClick={pick}>
                <IconReplace />
              </ToolButton>
              <ToolButton label="Delete image" danger onClick={deleteNode}>
                <IconTrash />
              </ToolButton>
            </NodeToolbar>
          ) : null}
        </div>
      ) : (
        <EmptyImage
          onPick={pick}
          onUrl={(url) => updateAttributes({ src: url })}
          onEscape={() => selectNode(editor, getPos)}
          onDelete={deleteNode}
        />
      )}

      {altOpen ? (
        <div className="wr-field-row" contentEditable={false}>
          <span className="wr-field-row__label">Alt</span>
          <AttrInput
            ref={alt}
            className="wr-field-row__input"
            label="Alt text"
            placeholder={attrs.caption ? "Defaults to the caption" : "Describe the image for someone who can't see it"}
            value={attrs.alt}
            onCommit={(value) => updateAttributes({ alt: value })}
            onEnter={() => {
              setAltOpen(false);
              caption.current?.focus();
            }}
            onEscape={() => {
              setAltOpen(false);
              selectNode(editor, getPos);
            }}
          />
        </div>
      ) : null}

      <figcaption className="wr-caption" contentEditable={false}>
        <AttrInput
          ref={caption}
          className="wr-caption__input"
          label="Caption"
          placeholder="Add a caption"
          value={attrs.caption}
          onCommit={(value) => updateAttributes({ caption: value })}
          onEnter={() => focusAfterNode(editor, getPos)}
          onEscape={() => selectNode(editor, getPos)}
          onExitDown={() => focusAfterNode(editor, getPos)}
        />
      </figcaption>
    </NodeViewWrapper>
  );
}

/** The empty frame: drop, upload, or paste a link. */
function EmptyImage({
  onPick,
  onUrl,
  onEscape,
  onDelete,
}: {
  onPick(): void;
  onUrl(url: string): void;
  onEscape(): void;
  onDelete(): void;
}) {
  const [url, setUrl] = useState("");
  return (
    <div className="wr-empty" contentEditable={false}>
      <IconImage size={22} className="wr-empty__icon" />
      <p className="wr-empty__title">Drop an image here</p>
      <div className="wr-empty__actions">
        <button type="button" className="wr-button" onClick={onPick}>
          <IconUpload />
          Upload
        </button>
        <span className="wr-empty__or">or</span>
        <input
          type="url"
          className="wr-empty__input"
          placeholder="Paste an image link"
          aria-label="Image link"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const value = url.trim();
              if (value) onUrl(value.startsWith("/") || value.startsWith("assets/") ? value : normalizeHref(value));
            } else if (event.key === "Escape") {
              event.preventDefault();
              onEscape();
            }
          }}
        />
      </div>
      <button type="button" className="wr-empty__remove" aria-label="Remove empty image" title="Remove" onClick={onDelete}>
        <IconTrash />
      </button>
    </div>
  );
}
