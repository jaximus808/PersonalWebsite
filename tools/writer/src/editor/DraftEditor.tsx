// The writer's editor: a TipTap document that looks like the site's article
// page, with the site's blocks (figure, gallery, video, callout, pull quote,
// divider, Anatomy figure) as live blocks, a "/" menu, a formatting bubble,
// a drag handle, and paste/drop that understands images, links and markdown.
// Props are the contract in SPEC.md ("Editor").

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { getSchema } from "@tiptap/core";

import type { DraftDoc, FigureRequest, Kind, UploadResult } from "../shared/types";
import { prepareInitialDoc } from "./doc";
import { EditorEnvContext, type EditorEnv, type NoticeTone } from "./env";
import { buildExtensions } from "./extensions";
import { IconClose } from "./icons";
import { BlockHandle } from "./menus/BlockHandle";
import { BubbleToolbar } from "./menus/BubbleToolbar";
import { TableMenu } from "./menus/TableMenu";
import { cx } from "./nodes/ui";

import "./editor.css";

export interface DraftEditorProps {
  draftKey: string; // "<kind>/<slug>", remount on change
  initialDoc: DraftDoc;
  kind: Kind;
  slug: string;
  onChange(doc: DraftDoc): void; // every transaction that changes the doc
  onReady?(editor: Editor): void;
  upload(file: File): Promise<UploadResult>; // provided by the app (calls the API)
  resolveSrc(src: string): string; // doc path -> browser URL (provided by the app)
  figures: FigureRequest[]; // built status, refreshed by the app
  /**
   * Figure ids whose built page is still on disk although no request uses
   * them (deleted in an earlier session). New requests never take these.
   */
  reservedFigureIds?: string[];
}

export default function DraftEditor(props: DraftEditorProps) {
  // A different draft is a different editor: fresh history, fresh schema
  // state, nothing carried over.
  return <LoadedDraft key={props.draftKey} {...props} />;
}

// ---------------------------------------------------------------------------
// Notices: short messages at the foot of the editor (upload failed, …).

interface Notice {
  id: number;
  message: string;
  tone: NoticeTone;
}

function useNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const next = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (message: string, tone: NoticeTone = "info") => {
      next.current += 1;
      const id = next.current;
      // The same message twice in a row (five failed files) shows once.
      setNotices((current) =>
        current.some((notice) => notice.message === message) ? current : [...current.slice(-3), { id, message, tone }],
      );
      timers.current.set(id, window.setTimeout(() => dismiss(id), tone === "error" ? 8000 : 4000));
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return { notices, notify, dismiss };
}

// ---------------------------------------------------------------------------

function LoadedDraft(props: DraftEditorProps) {
  const { notices, notify, dismiss } = useNotices();

  // Plugins read the latest props through this getter, so the editor is
  // built once per draft and never rebuilt for a new callback identity.
  const latest = useRef(props);
  const notifyRef = useRef(notify);
  useLayoutEffect(() => {
    latest.current = props;
    notifyRef.current = notify;
  });

  const getEnv = useCallback(
    (): EditorEnv => ({
      kind: latest.current.kind,
      slug: latest.current.slug,
      upload: (file) => latest.current.upload(file),
      resolveSrc: (src) => latest.current.resolveSrc(src),
      figures: latest.current.figures,
      notify: (message, tone) => notifyRef.current(message, tone),
    }),
    [],
  );

  const [extensions] = useState(() => buildExtensions(getEnv));
  const [prepared] = useState(() => prepareInitialDoc(getSchema(extensions), props.initialDoc));

  if (!prepared.ok) {
    return (
      <div className="wr-editor wr-editor--error" role="alert">
        <p className="wr-editor__error-title">This draft couldn't be opened</p>
        <p className="wr-editor__error-body">{prepared.error}</p>
        <p className="wr-editor__error-body">
          Nothing was changed on disk. The raw document is in <code>doc.json</code> in the draft's folder.
        </p>
      </div>
    );
  }

  return (
    <EditorShell
      {...props}
      extensions={extensions}
      initialContent={prepared.doc}
      repairs={prepared.repairs}
      notices={notices}
      notify={notify}
      dismiss={dismiss}
      latest={latest}
    />
  );
}

interface ShellProps extends DraftEditorProps {
  extensions: ReturnType<typeof buildExtensions>;
  initialContent: DraftDoc;
  repairs: string[];
  notices: Notice[];
  notify(message: string, tone?: NoticeTone): void;
  dismiss(id: number): void;
  latest: RefObject<DraftEditorProps>;
}

function EditorShell({
  extensions,
  initialContent,
  repairs,
  notices,
  notify,
  dismiss,
  latest,
  kind,
  slug,
  upload,
  resolveSrc,
  figures,
  reservedFigureIds,
}: ShellProps) {
  const editor = useEditor(
    {
      extensions,
      content: initialContent,
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          class: "prose wr-content",
          spellcheck: "true",
          "aria-label": "Draft body",
          "aria-multiline": "true",
        },
      },
      onUpdate: ({ editor: e }) => latest.current?.onChange(e.getJSON()),
    },
    [],
  );

  // Hand the app its editor once it exists (and again if React recreates it).
  useEffect(() => {
    if (editor) latest.current?.onReady?.(editor);
  }, [editor, latest]);

  // Ids the server knows about (anatomy.json) are taken, even if the doc no
  // longer has them: their built files are still on disk.
  useEffect(() => {
    const seen = editor?.storage.anatomy?.seen;
    if (!seen) return;
    for (const figure of figures) seen.add(figure.id);
    for (const id of reservedFigureIds ?? []) seen.add(id);
  }, [editor, figures, reservedFigureIds]);

  // Repairs made while loading are worth knowing about, once.
  const told = useRef(false);
  useEffect(() => {
    if (told.current || repairs.length === 0) return;
    told.current = true;
    notify(`Opened with repairs: ${repairs.slice(0, 3).join("; ")}${repairs.length > 3 ? "; …" : ""}.`, "info");
  }, [repairs, notify]);

  const env = useMemo<EditorEnv>(
    () => ({ kind, slug, upload, resolveSrc, figures, notify }),
    [kind, slug, upload, resolveSrc, figures, notify],
  );

  return (
    <EditorEnvContext.Provider value={env}>
      <div className="wr-editor">
        <EditorContent editor={editor} className="wr-surface" />
        {editor ? (
          <>
            <BubbleToolbar editor={editor} />
            <TableMenu editor={editor} />
            <BlockHandle editor={editor} />
          </>
        ) : null}
        <div className="wr-notices" aria-live="polite" aria-relevant="additions">
          {notices.map((notice) => (
            <div key={notice.id} className={cx("wr-notice", notice.tone === "error" && "is-error")} role="status">
              <span>{notice.message}</span>
              <button type="button" className="wr-notice__close" aria-label="Dismiss" onClick={() => dismiss(notice.id)}>
                <IconClose size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </EditorEnvContext.Provider>
  );
}
