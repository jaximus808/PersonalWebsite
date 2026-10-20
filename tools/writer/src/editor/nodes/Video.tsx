// video: a 16:9 YouTube embed or an uploaded file, with an optional caption
// and title. Becomes <Video youtube="id" /> or <Video src poster loop />
// (components/content/Video.tsx).

import { useRef, useState, type DragEvent } from "react";
import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";

import { NODE, type VideoAttrs } from "../../shared/types";
import { insertBlockNode } from "../blocks";
import { useEditorEnv } from "../env";
import { IconAlt, IconClose, IconImage, IconLoop, IconPlay, IconReplace, IconTrash, IconUpload, IconVideo } from "../icons";
import { isVideoUrl, mediaKindOf, normalizeHref, parseYouTubeId } from "../media";
import { bool, dataAttr, nullableText, text } from "./attrs";
import {
  AttrInput,
  cx,
  droppedFiles,
  type FieldHandle,
  focusAfterNode,
  Frame,
  NodeToolbar,
  selectNode,
  ToolButton,
  ToolDivider,
  useFileDragOver,
  useFilePicker,
  useFocusWithin,
  usePrefersReducedMotion,
} from "./ui";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      insertVideo: (attrs?: Partial<VideoAttrs>) => ReturnType;
    };
  }
}

export const Video = TiptapNode.create({
  name: NODE.video,
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      youtube: dataAttr("youtube", null, nullableText),
      src: dataAttr("src", null, nullableText),
      poster: dataAttr("poster", null, nullableText),
      loop: dataAttr("loop", false, bool),
      caption: dataAttr("caption", "", text),
      title: dataAttr("title", "", text),
    };
  },

  parseHTML() {
    return [
      { tag: 'figure[data-type="video"]' },
      {
        // A YouTube embed pasted from a web page.
        tag: "iframe[src]",
        priority: 40,
        getAttrs: (element) => {
          const youtube = parseYouTubeId(element.getAttribute("src") ?? "");
          return youtube ? { youtube } : false;
        },
      },
      {
        tag: "video[src]",
        priority: 40,
        getAttrs: (element) => ({
          src: element.getAttribute("src"),
          poster: element.getAttribute("poster"),
          loop: element.hasAttribute("loop"),
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { youtube, src } = node.attrs as VideoAttrs;
    const link = youtube ? `https://www.youtube.com/watch?v=${youtube}` : (src ?? "");
    return ["figure", mergeAttributes({ "data-type": "video" }, HTMLAttributes), ["a", { href: link }, link]];
  },

  addCommands() {
    return {
      insertVideo:
        (attrs = {}) =>
        ({ tr, dispatch }) => {
          if (dispatch) insertBlockNode(tr, this.type.create(attrs), true);
          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoView);
  },
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function VideoView({ node, updateAttributes, deleteNode, selected, editor, getPos }: ReactNodeViewProps) {
  const env = useEditorEnv();
  const attrs = node.attrs as VideoAttrs;
  const focus = useFocusWithin();
  const drag = useFileDragOver();
  const reduced = usePrefersReducedMotion();
  const [uploading, setUploading] = useState<"video" | "poster" | null>(null);
  const [playing, setPlaying] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);
  const caption = useRef<FieldHandle>(null);
  const title = useRef<FieldHandle>(null);
  const active = selected || focus.inside;

  async function upload(file: File, as: "video" | "poster") {
    const expected = as === "video" ? "video" : "image";
    if (mediaKindOf(file) !== expected) {
      env.notify(as === "video" ? `${file.name} isn't a video.` : `${file.name} isn't an image.`, "error");
      return;
    }
    setUploading(as);
    try {
      const result = await env.upload(file);
      updateAttributes(as === "video" ? { src: result.src, youtube: null } : { poster: result.src });
    } catch (error) {
      env.notify(`Couldn't upload ${file.name}: ${errorMessage(error)}`, "error");
    } finally {
      setUploading(null);
    }
  }

  const pickVideo = useFilePicker({ accept: "video/*", onFiles: ([file]) => void upload(file, "video") });
  const pickPoster = useFilePicker({ accept: "image/*", onFiles: ([file]) => void upload(file, "poster") });

  const clear = () => {
    setPlaying(false);
    updateAttributes({ youtube: null, src: null, poster: null, loop: false });
  };

  let body;
  if (attrs.youtube) {
    const still = attrs.poster ? env.resolveSrc(attrs.poster) : `https://i.ytimg.com/vi/${attrs.youtube}/hqdefault.jpg`;
    body = playing ? (
      <iframe
        className="wr-video__frame"
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(attrs.youtube)}?autoplay=1&rel=0`}
        title={attrs.title || "YouTube video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    ) : (
      <button type="button" className="wr-video__poster" onClick={() => setPlaying(true)} aria-label={`Play ${attrs.title || "video"}`}>
        <img src={still} alt="" draggable={false} />
        <span className="wr-video__play">
          <IconPlay size={22} />
        </span>
      </button>
    );
  } else if (attrs.src) {
    const ambient = attrs.loop && !reduced;
    body = (
      <video
        key={ambient ? "ambient" : "manual"}
        className="wr-video__file"
        src={env.resolveSrc(attrs.src)}
        poster={attrs.poster ? env.resolveSrc(attrs.poster) : undefined}
        playsInline
        preload="metadata"
        {...(ambient ? { autoPlay: true, muted: true, loop: true } : { controls: true, loop: attrs.loop })}
      />
    );
  }

  return (
    <NodeViewWrapper
      as="figure"
      className={cx("wr-block wr-video", active && "is-active", selected && "is-selected", drag.over && "is-drop-target")}
      data-wr-dropzone=""
      {...focus.handlers}
      {...drag.handlers}
      onDrop={(event: DragEvent) => {
        drag.reset();
        const [file] = droppedFiles(event);
        if (!file) return;
        event.preventDefault();
        void upload(file, mediaKindOf(file) === "image" && (attrs.src || attrs.youtube) ? "poster" : "video");
      }}
    >
      {body ? (
        <div className="wr-media">
          <Frame ratio="wide">{body}</Frame>
          {uploading ? <div className="wr-progress" aria-label="Uploading" /> : null}
          {active ? (
            <NodeToolbar label="Video" className="wr-media__toolbar">
              {attrs.src ? (
                <>
                  <ToolButton
                    label={attrs.loop ? "Looping silently" : "Loop silently"}
                    pressed={attrs.loop}
                    onClick={() => updateAttributes({ loop: !attrs.loop })}
                    showLabel
                  >
                    <IconLoop />
                  </ToolButton>
                  <ToolButton label={attrs.poster ? "Replace poster" : "Add poster"} onClick={pickPoster}>
                    <IconImage />
                  </ToolButton>
                  {attrs.poster ? (
                    <ToolButton label="Remove poster" onClick={() => updateAttributes({ poster: null })}>
                      <IconClose />
                    </ToolButton>
                  ) : null}
                  <ToolDivider />
                </>
              ) : null}
              <ToolButton
                label="Title (for screen readers)"
                pressed={titleOpen || !!attrs.title}
                onClick={() => {
                  setTitleOpen((open) => !open);
                  requestAnimationFrame(() => title.current?.focus());
                }}
              >
                <IconAlt />
              </ToolButton>
              <ToolButton label="Change video" onClick={clear}>
                <IconReplace />
              </ToolButton>
              <ToolButton label="Delete video" danger onClick={deleteNode}>
                <IconTrash />
              </ToolButton>
            </NodeToolbar>
          ) : null}
        </div>
      ) : (
        <EmptyVideo
          busy={uploading === "video"}
          onPick={pickVideo}
          onLink={(value) => {
            const youtube = parseYouTubeId(value);
            if (youtube) {
              updateAttributes({ youtube, src: null });
              return true;
            }
            if (isVideoUrl(value)) {
              updateAttributes({ src: value.startsWith("/") ? value : normalizeHref(value), youtube: null });
              return true;
            }
            env.notify("That isn't a YouTube link or a video file URL.", "error");
            return false;
          }}
          onEscape={() => selectNode(editor, getPos)}
          onDelete={deleteNode}
        />
      )}

      {body && titleOpen ? (
        <div className="wr-field-row" contentEditable={false}>
          <span className="wr-field-row__label">Title</span>
          <AttrInput
            ref={title}
            className="wr-field-row__input"
            label="Video title"
            placeholder="What the video is, for screen readers"
            value={attrs.title}
            onCommit={(value) => updateAttributes({ title: value })}
            onEnter={() => {
              setTitleOpen(false);
              caption.current?.focus();
            }}
            onEscape={() => {
              setTitleOpen(false);
              selectNode(editor, getPos);
            }}
          />
        </div>
      ) : null}

      {body ? (
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
      ) : null}
    </NodeViewWrapper>
  );
}

function EmptyVideo({
  busy,
  onPick,
  onLink,
  onEscape,
  onDelete,
}: {
  busy: boolean;
  onPick(): void;
  onLink(value: string): boolean;
  onEscape(): void;
  onDelete(): void;
}) {
  const [value, setValue] = useState("");
  return (
    <div className={cx("wr-empty wr-empty--wide", busy && "is-uploading")} contentEditable={false}>
      <IconVideo size={22} className="wr-empty__icon" />
      <p className="wr-empty__title">{busy ? "Uploading video…" : "Add a video"}</p>
      <div className="wr-empty__actions">
        <input
          type="url"
          className="wr-empty__input"
          placeholder="YouTube link or id"
          aria-label="YouTube link or id"
          value={value}
          disabled={busy}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (value.trim() && onLink(value.trim())) setValue("");
            } else if (event.key === "Escape") {
              event.preventDefault();
              onEscape();
            }
          }}
        />
        <span className="wr-empty__or">or</span>
        <button type="button" className="wr-button" onClick={onPick} disabled={busy}>
          <IconUpload />
          Upload a file
        </button>
      </div>
      {busy ? <div className="wr-progress" /> : null}
      <button type="button" className="wr-empty__remove" aria-label="Remove empty video" title="Remove" onClick={onDelete}>
        <IconTrash />
      </button>
    </div>
  );
}
