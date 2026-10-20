// gallery: several images side by side in identical square frames, one
// caption under the set. Becomes <Gallery images={[…]} caption columns />
// (components/content/Gallery.tsx: square, cover, 2 columns by default).

import { useRef, useState, type DragEvent } from "react";
import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";

import { NODE, type GalleryAttrs } from "../../shared/types";
import { insertBlockNode } from "../blocks";
import { useEditorEnv } from "../env";
import { IconArrowLeft, IconArrowRight, IconClose, IconGallery, IconImage, IconPlus, IconTrash, IconUpload } from "../icons";
import { sortMediaFiles } from "../media";
import { dataAttr, json, oneOf, text } from "./attrs";
import {
  AttrInput,
  cx,
  droppedFiles,
  focusAfterNode,
  FramedImage,
  NodeToolbar,
  Segmented,
  selectNode,
  ToolButton,
  ToolDivider,
  useFileDragOver,
  useFilePicker,
  useFocusWithin,
} from "./ui";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gallery: {
      insertGallery: (attrs?: Partial<GalleryAttrs>) => ReturnType;
    };
  }
}

/** dataTransfer type for reordering tiles inside one gallery. */
const TILE_MIME = "application/x-writer-gallery-tile";

export const Gallery = TiptapNode.create({
  name: NODE.gallery,
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      images: dataAttr<string[]>("images", [], json<string[]>([])),
      caption: dataAttr("caption", "", text),
      columns: dataAttr<2 | 3 | null>("columns", null, oneOf<2 | 3 | null>([2, 3], null)),
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="gallery"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { images, caption } = node.attrs as GalleryAttrs;
    return [
      "figure",
      mergeAttributes({ "data-type": "gallery" }, HTMLAttributes),
      ["div", {}, ...images.map((src) => ["img", { src, alt: "" }] as const)],
      ["figcaption", {}, caption],
    ];
  },

  addCommands() {
    return {
      insertGallery:
        (attrs = {}) =>
        ({ tr, dispatch }) => {
          if (dispatch) insertBlockNode(tr, this.type.create(attrs), true);
          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryView);
  },
});

function cleanImages(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((src): src is string => typeof src === "string" && src.length > 0) : [];
}

interface Pending {
  key: string;
  url: string;
}

let pendingKey = 0;

function GalleryView({ node, updateAttributes, deleteNode, selected, editor, getPos }: ReactNodeViewProps) {
  const env = useEditorEnv();
  const attrs = node.attrs as GalleryAttrs;
  const images = cleanImages(attrs.images);
  const columns = attrs.columns === 3 ? 3 : 2;
  const focus = useFocusWithin();
  const drag = useFileDragOver();
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const active = selected || focus.inside;

  // Uploads finish after other edits; always append to the latest list.
  const latest = useRef(images);
  latest.current = images;

  const setImages = (next: string[]) => updateAttributes({ images: next });

  async function addFiles(files: File[]) {
    const { images: chosen, videos, rejected } = sortMediaFiles(files);
    for (const { file, reason } of rejected) env.notify(`${file.name} wasn't added: ${reason}.`, "error");
    if (videos.length) env.notify("Galleries hold images only; add videos as their own block.", "error");
    if (!chosen.length) return;

    const batch = chosen.map((file) => ({ key: `p${(pendingKey += 1)}`, url: URL.createObjectURL(file), file }));
    setPending((current) => [...current, ...batch.map(({ key, url }) => ({ key, url }))]);
    const results = await Promise.allSettled(batch.map(({ file }) => env.upload(file)));
    const added: string[] = [];
    results.forEach((result, i) => {
      if (result.status === "fulfilled") added.push(result.value.src);
      else env.notify(`Couldn't upload ${batch[i].file.name}.`, "error");
    });
    if (added.length) setImages([...latest.current, ...added]);
    for (const { url } of batch) URL.revokeObjectURL(url);
    const done = new Set(batch.map(({ key }) => key));
    setPending((current) => current.filter((item) => !done.has(item.key)));
  }

  const pick = useFilePicker({ accept: "image/*", multiple: true, onFiles: (files) => void addFiles(files) });

  function move(from: number, to: number) {
    if (from === to || to < 0 || to > images.length) return;
    const next = images.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to > from ? to - 1 : to, 0, moved);
    setImages(next);
  }

  function remove(index: number) {
    setImages(images.filter((_, i) => i !== index));
  }

  function turnIntoFigure() {
    const pos = getPos();
    if (pos == null || images.length !== 1) return;
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: pos, to: pos + node.nodeSize },
        { type: NODE.figure, attrs: { src: images[0], caption: attrs.caption, alt: "", ratio: "standard", fit: "contain" } },
      )
      .run();
  }

  const onGridDragOver = (event: DragEvent) => {
    if (Array.from(event.dataTransfer.types).includes(TILE_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  };

  const onGridDrop = (event: DragEvent) => {
    drag.reset();
    if (Array.from(event.dataTransfer.types).includes(TILE_MIME)) {
      event.preventDefault();
      const from = Number(event.dataTransfer.getData(TILE_MIME));
      if (Number.isInteger(from) && dropAt !== null) move(from, dropAt);
    } else {
      const files = droppedFiles(event);
      if (files.length) {
        event.preventDefault();
        void addFiles(files);
      }
    }
    setDragFrom(null);
    setDropAt(null);
  };

  const empty = images.length === 0 && pending.length === 0;

  return (
    <NodeViewWrapper
      as="figure"
      className={cx("wr-block wr-gallery", active && "is-active", selected && "is-selected", drag.over && "is-drop-target")}
      data-wr-dropzone=""
      {...focus.handlers}
      {...drag.handlers}
      onDragOver={(event: DragEvent) => {
        drag.handlers.onDragOver(event);
        onGridDragOver(event);
      }}
      onDrop={onGridDrop}
    >
      {active && !empty ? (
        <NodeToolbar label="Gallery" className="wr-gallery__toolbar">
          <Segmented
            label="Columns"
            value={columns}
            options={[
              { value: 2, label: "2 col", title: "Two columns" },
              { value: 3, label: "3 col", title: "Three columns" },
            ]}
            onChange={(value) => updateAttributes({ columns: value === 3 ? 3 : null })}
          />
          <ToolDivider />
          <ToolButton label="Add images" onClick={pick}>
            <IconPlus />
          </ToolButton>
          {images.length === 1 ? (
            <ToolButton label="Make it a single figure" onClick={turnIntoFigure}>
              <IconImage />
            </ToolButton>
          ) : null}
          <ToolButton label="Delete gallery" danger onClick={deleteNode}>
            <IconTrash />
          </ToolButton>
        </NodeToolbar>
      ) : null}

      {empty ? (
        <div className="wr-empty" contentEditable={false}>
          <IconGallery size={22} className="wr-empty__icon" />
          <p className="wr-empty__title">Drop two or more images here</p>
          <div className="wr-empty__actions">
            <button type="button" className="wr-button" onClick={pick}>
              <IconUpload />
              Choose images
            </button>
          </div>
          <button type="button" className="wr-empty__remove" aria-label="Remove empty gallery" title="Remove" onClick={deleteNode}>
            <IconTrash />
          </button>
        </div>
      ) : (
        <div className={cx("wr-gallery__grid", columns === 3 && "is-three")} contentEditable={false}>
          {images.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className={cx(
                "wr-tile",
                dragFrom === index && "is-dragging",
                dropAt === index && "drop-before",
                dropAt === index + 1 && index === images.length - 1 && "drop-after",
              )}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(TILE_MIME, String(index));
                event.dataTransfer.effectAllowed = "move";
                setDragFrom(index);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDropAt(null);
              }}
              onDragOver={(event) => {
                if (!Array.from(event.dataTransfer.types).includes(TILE_MIME)) return;
                const box = event.currentTarget.getBoundingClientRect();
                setDropAt(event.clientX < box.left + box.width / 2 ? index : index + 1);
              }}
            >
              <FramedImage src={env.resolveSrc(src)} alt="" ratio="square" fit="cover" />
              <div className="wr-tile__controls">
                <ToolButton label="Move left" disabled={index === 0} onClick={() => move(index, index - 1)}>
                  <IconArrowLeft />
                </ToolButton>
                <ToolButton label="Move right" disabled={index === images.length - 1} onClick={() => move(index, index + 2)}>
                  <IconArrowRight />
                </ToolButton>
                <ToolButton label="Remove from gallery" danger onClick={() => remove(index)}>
                  <IconClose />
                </ToolButton>
              </div>
            </div>
          ))}
          {pending.map((item) => (
            <div key={item.key} className="wr-tile is-uploading" aria-label="Uploading">
              <div className="wr-frame" style={{ aspectRatio: "1 / 1" }}>
                <img src={item.url} alt="" className="wr-frame__img is-cover" />
              </div>
              <div className="wr-progress" />
            </div>
          ))}
          <button type="button" className="wr-tile wr-tile--add" onClick={pick} aria-label="Add images">
            <IconPlus size={20} />
          </button>
        </div>
      )}

      {images.length === 1 && pending.length === 0 ? (
        <p className="wr-block-note" contentEditable={false}>
          A gallery needs at least two images. Add another, or make it a single figure.
        </p>
      ) : null}

      {!empty ? (
        <figcaption className="wr-caption" contentEditable={false}>
          <AttrInput
            className="wr-caption__input"
            label="Gallery caption"
            placeholder="Add a caption"
            value={attrs.caption}
            onCommit={(value) => updateAttributes({ caption: value })}
            onEnter={() => focusAfterNode(editor, getPos)}
            onEscape={() => selectNode(editor, getPos)}
            onExitDown={() => focusAfterNode(editor, getPos)}
          />
        </figcaption>
      ) : null}
    </NodeViewWrapper>
  );
}
