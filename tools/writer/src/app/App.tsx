// The writer's shell: drafts rail on the left, the page in the middle (Write
// or Preview), details on the right. Owns which draft is open (mirrored in
// ?draft=<kind>/<slug>), the keyboard shortcuts, and every dialog.

import type { Editor as TiptapEditor } from "@tiptap/react";
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import DraftEditor from "../editor/DraftEditor";
import type { DraftDoc, DraftFile, DraftMeta, DraftSummary, Kind } from "../shared/types";
import { api, errorMessage } from "./api";
import { docImages, outline, safeDraftToMdx, safeFigureRequests, safeLint, safeWordCount } from "./doc";
import { useFigures, useMediaQuery, usePref, usePrefersReducedMotion, useUploads } from "./hooks";
import { PageHead } from "./page/PageHead";
import { CoverPicker } from "./page/CoverPicker";
import { DetailsPanel } from "./panel/DetailsPanel";
import { ChecksPanel, FiguresPanel, MdxPanel, OutlinePanel } from "./panel/Panels";
import { SidePanel, type PanelTab } from "./panel/SidePanel";
import { draftKey, parseDraftKey, resolveSrc, sameDraft, type DraftRef } from "./paths";
import { Preview } from "./preview/Preview";
import { clearLocalCopy } from "./recovery";
import { ImportDialog } from "./shell/ImportDialog";
import { NewDraftDialog } from "./shell/NewDraftDialog";
import { Rail } from "./shell/Rail";
import { EmptyState, LoadFailed, MissingDraft, RecoveryBanner, ShortcutsDialog } from "./shell/Screens";
import { TopBar, type Mode } from "./shell/TopBar";
import { ConfirmDialog } from "./ui/Dialog";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { Icon } from "./ui/Icon";
import { useToast } from "./ui/Toasts";
import { useDraftSession } from "./useDraftSession";

// The editor re-renders only when its own props change, not on every keystroke
// the shell reacts to.
const MemoEditor = memo(DraftEditor);

function draftFromUrl(): DraftRef | null {
  return parseDraftKey(new URLSearchParams(window.location.search).get("draft"));
}

function writeUrl(ref: DraftRef | null, mode: "push" | "replace") {
  const url = new URL(window.location.href);
  if (ref) url.searchParams.set("draft", draftKey(ref));
  else url.searchParams.delete("draft");
  // Keep the slash readable: ?draft=blog/my-post rather than blog%2Fmy-post.
  const next = `${url.pathname}${url.search.replace(/%2F/gi, "/")}${url.hash}`;
  if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
  if (mode === "push") window.history.pushState(null, "", next);
  else window.history.replaceState(null, "", next);
}

function newestFirst(list: DraftSummary[]): DraftSummary[] {
  return [...list].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
}

type DeleteState = { draft: DraftSummary; busy: boolean } | null;

export default function App() {
  const toast = useToast();
  const reducedMotion = usePrefersReducedMotion();
  const narrow = useMediaQuery("(max-width: 1180px)");
  const compact = useMediaQuery("(max-width: 900px)");

  // ---- Which draft is open --------------------------------------------------
  const [current, setCurrent] = useState<DraftRef | null>(draftFromUrl);
  const currentKey = current ? draftKey(current) : null;

  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [draftsError, setDraftsError] = useState<string | null>(null);

  const [railTab, setRailTab] = usePref<Kind>("railTab", current?.kind ?? "blog");
  const [railPref, setRailPref] = usePref("railOpen", true);
  const [panelPref, setPanelPref] = usePref("panelOpen", true);
  const [panelTab, setPanelTab] = usePref<PanelTab>("panelTab", "details");
  // On small screens the rail and panel float over the page and start closed.
  const [railFloating, setRailFloating] = useState(false);
  const [panelFloating, setPanelFloating] = useState(false);
  const railOpen = compact ? railFloating : railPref;
  const panelOpen = narrow ? panelFloating : panelPref;
  const setRailOpen = useCallback(
    (open: boolean) => (compact ? setRailFloating(open) : setRailPref(open)),
    [compact, setRailPref],
  );
  const setPanelOpen = useCallback(
    (open: boolean) => (narrow ? setPanelFloating(open) : setPanelPref(open)),
    [narrow, setPanelPref],
  );

  const [mode, setMode] = useState<Mode>("write");
  const [newDraft, setNewDraft] = useState<{ kind: Kind; slug?: string } | null>(null);
  const [importOpen, setImportOpen] = useState<{ focus: DraftRef | null } | null>(null);
  const [deleting, setDeleting] = useState<DeleteState>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const editorRef = useRef<TiptapEditor | null>(null);
  const onEditorReady = useCallback((editor: TiptapEditor) => {
    editorRef.current = editor;
  }, []);
  const canvasRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollByMode = useRef<Record<Mode, number>>({ write: 0, preview: 0 });

  const loadDrafts = useCallback(async () => {
    try {
      setDrafts(newestFirst(await api.listDrafts()));
      setDraftsError(null);
    } catch (error) {
      setDraftsError(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
    // Claude creates drafts through the API too; pick them up on return.
    const onFocus = () => void loadDrafts();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadDrafts]);

  const select = useCallback(
    (ref: DraftRef | null) => {
      setCurrent((previous) => (sameDraft(previous, ref) ? previous : ref));
      writeUrl(ref, "push");
      if (ref) setRailTab(ref.kind);
      if (compact) setRailFloating(false);
    },
    [compact, setRailTab],
  );

  // The rail shows the open draft's kind, however it was opened (URL, back button).
  useEffect(() => {
    if (current) setRailTab(current.kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  useEffect(() => {
    const onPop = () => setCurrent(draftFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ---- The open draft -------------------------------------------------------
  const onSaved = useCallback((ref: DraftRef, meta: DraftMeta, doc: DraftDoc, result: { savedAt: string }) => {
    setDrafts((list) =>
      list
        ? newestFirst(
            list.map((draft) =>
              sameDraft(draft, ref)
                ? { ...draft, title: meta.title, updatedAt: result.savedAt, words: safeWordCount(doc) }
                : draft,
            ),
          )
        : list,
    );
  }, []);

  const session = useDraftSession(current, { onSaved });
  const { meta, doc } = session;
  // Ready only once the loaded draft is the selected one: for a render after
  // switching, session still holds the previous draft's meta and doc.
  const ready = session.load.status === "ready" && meta && doc && session.editor && sameDraft(meta, current);

  const resolve = useCallback(
    (src: string) => (current ? resolveSrc(src, current) : src),
    // current is identified by its key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentKey],
  );

  const { uploads, upload } = useUploads(current, (message) => toast(message, "error"));

  // Derived views lag the keystroke slightly so typing never waits on them.
  const deferredDoc = useDeferredValue(doc);
  const deferredMeta = useDeferredValue(meta);
  const words = useMemo(() => (deferredDoc ? safeWordCount(deferredDoc) : 0), [deferredDoc]);
  const outlineItems = useMemo(() => (deferredDoc ? outline(deferredDoc) : []), [deferredDoc]);
  const problems = useMemo(
    () => (deferredMeta && deferredDoc ? safeLint(deferredMeta, deferredDoc) : []),
    [deferredMeta, deferredDoc],
  );
  const requests = useMemo(() => (deferredDoc ? safeFigureRequests(deferredDoc) : []), [deferredDoc]);
  const { figures, reservedIds, refresh: refreshFigures } = useFigures(ready ? current : null, requests);
  const showMdx = panelOpen && panelTab === "mdx";
  const liveMdx = useMemo(
    () => (showMdx && deferredMeta && deferredDoc ? safeDraftToMdx(deferredMeta, deferredDoc) : null),
    [showMdx, deferredMeta, deferredDoc],
  );

  // A save rewrites anatomy.json; look at the figures again afterwards.
  const savedAt = session.save.status === "clean" ? session.save.savedAt : null;
  useEffect(() => {
    if (savedAt && requests.length > 0) void refreshFigures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAt]);

  const summary = drafts?.find((draft) => sameDraft(draft, current)) ?? null;

  useEffect(() => {
    document.title = meta ? `${meta.title.trim() || "Untitled"} · Writer` : "Writer";
  }, [meta]);

  // A brand-new draft opens with the caret in its title.
  const editorKey = session.editor?.key;
  useEffect(() => {
    if (!editorKey || mode !== "write") return;
    if (!meta?.title.trim()) {
      window.requestAnimationFrame(() => document.querySelector<HTMLTextAreaElement>(".title-input")?.focus());
    }
    // Only on a fresh mount of the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey]);

  // ---- Modes and scrolling ---------------------------------------------------
  const switchMode = useCallback(
    (next: Mode) => {
      setMode((currentMode) => {
        if (currentMode === next) return currentMode;
        const canvas = canvasRef.current;
        if (canvas) {
          scrollByMode.current[currentMode] = canvas.scrollTop;
          const target = scrollByMode.current[next];
          window.requestAnimationFrame(() => canvas.scrollTo({ top: target }));
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    scrollByMode.current = { write: 0, preview: 0 };
    canvasRef.current?.scrollTo({ top: 0 });
  }, [currentKey]);

  const scrollBehavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";

  /** ProseMirror position of the nth heading, or of an anatomy node by id. */
  const findPos = useCallback((match: (name: string, attrs: Record<string, unknown>, index: number) => boolean) => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) return null;
    let found: number | null = null;
    let headingIndex = 0;
    editor.state.doc.descendants((node, pos) => {
      if (found !== null) return false;
      const index = node.type.name === "heading" ? headingIndex++ : -1;
      if (match(node.type.name, node.attrs, index)) {
        found = pos;
        return false;
      }
      return true;
    });
    return found;
  }, []);

  const jumpToHeading = useCallback(
    (index: number) => {
      if (mode === "preview") {
        const headings = previewRef.current?.querySelectorAll<HTMLElement>("[data-preview-body] :is(h2, h3, h4)");
        headings?.[index]?.scrollIntoView({ behavior: scrollBehavior, block: "start" });
        return;
      }
      const editor = editorRef.current;
      const pos = findPos((name, _attrs, i) => name === "heading" && i === index);
      if (!editor || pos === null) return;
      const dom = editor.view.nodeDOM(pos);
      if (dom instanceof HTMLElement) dom.scrollIntoView({ behavior: scrollBehavior, block: "start" });
      const node = editor.state.doc.nodeAt(pos);
      if (node) {
        editor.chain().setTextSelection(pos + node.nodeSize - 1).focus(undefined, { scrollIntoView: false }).run();
      }
      if (narrow) setPanelFloating(false);
    },
    [findPos, mode, narrow, scrollBehavior],
  );

  const jumpToFigure = useCallback(
    (id: string) => {
      const go = () => {
        const editor = editorRef.current;
        const pos = findPos((name, attrs) => name === "anatomy" && attrs.id === id);
        if (!editor || pos === null) return;
        const dom = editor.view.nodeDOM(pos);
        if (dom instanceof HTMLElement) dom.scrollIntoView({ behavior: scrollBehavior, block: "center" });
        editor.chain().setNodeSelection(pos).focus(undefined, { scrollIntoView: false }).run();
      };
      if (narrow) setPanelFloating(false);
      if (mode === "preview") {
        switchMode("write");
        // Wait for the editor to be visible again before measuring.
        window.requestAnimationFrame(() => window.requestAnimationFrame(go));
      } else {
        go();
      }
    },
    [findPos, mode, narrow, scrollBehavior, switchMode],
  );

  // Which heading the reader is in, for the outline.
  const [activeHeading, setActiveHeading] = useState<number | null>(null);
  const outlineVisible = panelOpen && panelTab === "outline" && outlineItems.length > 0;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !outlineVisible) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      let elements: HTMLElement[] = [];
      if (mode === "preview") {
        elements = Array.from(
          previewRef.current?.querySelectorAll<HTMLElement>("[data-preview-body] :is(h2, h3, h4)") ?? [],
        );
      } else {
        const editor = editorRef.current;
        if (!editor || editor.isDestroyed) return;
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === "heading") {
            const dom = editor.view.nodeDOM(pos);
            if (dom instanceof HTMLElement) elements.push(dom);
            return false;
          }
          return true;
        });
      }
      const box = canvas.getBoundingClientRect();
      // At the very bottom the last sections can't reach the top; count
      // anything on screen as read.
      const atBottom = canvas.scrollTop + canvas.clientHeight >= canvas.scrollHeight - 4;
      const line = atBottom ? box.bottom - 40 : box.top + 140;
      let active: number | null = null;
      elements.forEach((element, index) => {
        if (element.getBoundingClientRect().top <= line) active = index;
      });
      setActiveHeading(active ?? (elements.length > 0 ? 0 : null));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    canvas.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      canvas.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [outlineVisible, mode, outlineItems]);

  // ---- Keyboard ---------------------------------------------------------------
  const saveNow = session.saveNow;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      const key = event.key.toLowerCase();
      if (key === "s" && !event.shiftKey && !event.altKey) {
        // Always swallow it: the browser's "Save page" is never what's wanted here.
        event.preventDefault();
        void saveNow();
      } else if (key === "p" && event.shiftKey) {
        event.preventDefault();
        if (current) switchMode(mode === "write" ? "preview" : "write");
      } else if (event.key === "\\" && !event.shiftKey) {
        event.preventDefault();
        setRailOpen(!railOpen);
      } else if (event.key === "." && !event.shiftKey) {
        event.preventDefault();
        if (current) setPanelOpen(!panelOpen);
      }
    };
    // Capture, so the editor's own keymaps never see Cmd+S first.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [current, mode, panelOpen, railOpen, saveNow, setPanelOpen, setRailOpen, switchMode]);

  // ---- Create, import, delete -------------------------------------------------
  const opened = useCallback(
    (file: DraftFile) => {
      setNewDraft(null);
      setImportOpen(null);
      setMode("write");
      void loadDrafts();
      select({ kind: file.meta.kind, slug: file.meta.slug });
    },
    [loadDrafts, select],
  );

  const confirmDelete = async () => {
    if (!deleting) return;
    const { draft } = deleting;
    setDeleting({ draft, busy: true });
    const isCurrent = sameDraft(current, draft);
    try {
      if (isCurrent) session.forget();
      await api.deleteDraft(draft.kind, draft.slug);
      clearLocalCopy(draft);
      setDrafts((list) => list?.filter((item) => !sameDraft(item, draft)) ?? list);
      if (isCurrent) select(null);
      toast(`“${draft.title || draft.slug}” moved to drafts/.trash.`, "success");
      setDeleting(null);
    } catch (error) {
      toast(errorMessage(error), "error");
      setDeleting(null);
      if (isCurrent) session.reload();
    }
  };

  // ---- Render -------------------------------------------------------------------
  const badges = {
    figures: { count: figures.filter((figure) => !figure.built).length, tone: "accent" as const },
    checks: problems.some((problem) => problem.level === "error")
      ? { count: problems.filter((problem) => problem.level === "error").length, tone: "error" as const }
      : { count: problems.length, tone: "quiet" as const },
  };

  const renderCanvas = () => {
    if (!current) {
      return (
        <EmptyState
          recent={(drafts ?? []).slice(0, 4)}
          onNew={(kind) => setNewDraft({ kind })}
          onImport={() => setImportOpen({ focus: null })}
          onSelect={select}
        />
      );
    }
    switch (session.load.status) {
      case "missing":
        return (
          <MissingDraft
            draft={current}
            onCreate={() => setNewDraft({ kind: current.kind, slug: current.slug })}
            onClose={() => select(null)}
          />
        );
      case "failed":
        return <LoadFailed message={session.load.message} onRetry={session.reload} />;
      case "idle":
      case "loading":
        return (
          <div className="page page--loading" aria-busy="true">
            <span className="skeleton skeleton--eyebrow" />
            <span className="skeleton skeleton--title" />
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--line" />
            <span className="skeleton skeleton--line skeleton--short" />
          </div>
        );
    }
    if (!ready) return null;

    return (
      <>
        {session.recovery ? (
          <RecoveryBanner
            copy={session.recovery}
            onRestore={session.restoreRecovery}
            onDismiss={session.dismissRecovery}
          />
        ) : null}

        {/* The editor stays mounted in Preview so undo history and the caret survive. */}
        <div className="write" hidden={mode === "preview"}>
          <article className={`page page--${meta.kind}`}>
            <PageHead
              meta={meta}
              words={words}
              resolveSrc={resolve}
              onChange={session.updateMeta}
              onEnterBody={() => editorRef.current?.commands.focus("start")}
              onPickCover={() => setCoverOpen(true)}
              onOpenDetails={() => {
                setPanelTab("details");
                setPanelOpen(true);
              }}
            />
            <div className={`page-body page-body--${meta.kind}`}>
              <ErrorBoundary
                resetKey={session.editor!.key}
                fallback={(error, reset) => (
                  <div className="editor-crash" role="alert">
                    <p>The editor hit a problem: {error.message}</p>
                    <p className="field__hint">Nothing is lost: the draft is saved and kept in this browser.</p>
                    <button type="button" className="button button--small" onClick={reset}>
                      <Icon name="refresh" size={14} />
                      Reload the editor
                    </button>
                  </div>
                )}
              >
                <MemoEditor
                  key={session.editor!.key}
                  draftKey={draftKey(current)}
                  initialDoc={session.editor!.doc}
                  kind={current.kind}
                  slug={current.slug}
                  onChange={session.setDoc}
                  onReady={onEditorReady}
                  upload={upload}
                  resolveSrc={resolve}
                  figures={figures}
                  reservedFigureIds={reservedIds}
                />
              </ErrorBoundary>
            </div>
          </article>
        </div>

        {mode === "preview" ? (
          <Preview ref={previewRef} meta={meta} doc={doc} words={words} figures={figures} />
        ) : null}
      </>
    );
  };

  const panelContent = () => {
    if (!ready || !current) return null;
    switch (panelTab) {
      case "details":
        return (
          <DetailsPanel
            meta={meta}
            published={!!summary?.published}
            resolveSrc={resolve}
            onChange={session.updateMeta}
            onPickCover={() => setCoverOpen(true)}
          />
        );
      case "outline":
        return <OutlinePanel items={outlineItems} active={activeHeading} onJump={jumpToHeading} />;
      case "figures":
        return <FiguresPanel figures={figures} draft={current} onJump={jumpToFigure} />;
      case "checks":
        return <ChecksPanel problems={problems} draft={current} figures={figures} />;
      case "mdx":
        return liveMdx ? (
          <MdxPanel live={liveMdx} diskMdx={session.diskMdx} exportError={session.exportError} />
        ) : null;
    }
  };

  const showPanel = !!(current && ready && panelOpen);

  return (
    <div
      className="app"
      data-rail={railOpen ? "open" : "closed"}
      data-panel={showPanel ? "open" : "closed"}
      data-narrow={narrow || undefined}
      data-compact={compact || undefined}
    >
      <div className="app__rail" inert={!railOpen}>
        <Rail
          drafts={drafts}
          loadError={draftsError}
          current={current}
          tab={railTab}
          onTab={setRailTab}
          onSelect={select}
          onNew={(kind) => setNewDraft({ kind })}
          onImport={() => setImportOpen({ focus: null })}
          onDelete={(draft) => setDeleting({ draft, busy: false })}
          onRetry={() => void loadDrafts()}
          onShortcuts={() => setShortcutsOpen(true)}
          onCollapse={() => setRailOpen(false)}
        />
      </div>

      <div className="stage">
        <TopBar
          current={current}
          save={current && ready ? session.save : null}
          words={ready ? words : null}
          mode={mode}
          uploads={uploads}
          railOpen={railOpen}
          panelOpen={showPanel}
          onMode={switchMode}
          onSaveNow={() => void saveNow()}
          onToggleRail={() => setRailOpen(!railOpen)}
          onTogglePanel={() => setPanelOpen(!panelOpen)}
        />
        <main className="canvas" ref={canvasRef} data-mode={mode}>
          {renderCanvas()}
        </main>
      </div>

      <div className="app__panel" inert={!showPanel}>
        {current && ready ? (
          <SidePanel tab={panelTab} onTab={setPanelTab} onClose={() => setPanelOpen(false)} badges={badges}>
            {panelContent()}
          </SidePanel>
        ) : null}
      </div>

      {(compact && railOpen) || (narrow && showPanel) ? (
        <button
          type="button"
          className="scrim"
          aria-label="Close"
          onClick={() => {
            setRailFloating(false);
            setPanelFloating(false);
          }}
        />
      ) : null}

      <NewDraftDialog
        open={newDraft !== null}
        initialKind={newDraft?.kind ?? railTab}
        initialSlug={newDraft?.slug}
        drafts={drafts ?? []}
        onClose={() => setNewDraft(null)}
        onCreated={opened}
        onOpenExisting={(ref) => {
          setNewDraft(null);
          select(ref);
        }}
        onImport={(ref) => {
          setNewDraft(null);
          setImportOpen({ focus: ref });
        }}
      />

      <ImportDialog
        open={importOpen !== null}
        focus={importOpen?.focus ?? null}
        onClose={() => setImportOpen(null)}
        onImported={(file) => {
          toast(`Imported “${file.meta.title || file.meta.slug}”.`, "success");
          opened(file);
        }}
        onOpenDraft={(ref) => {
          setImportOpen(null);
          select(ref);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        busy={deleting?.busy}
        tone="danger"
        title="Move this draft to the trash?"
        body={
          <p>
            “{deleting?.draft.title || deleting?.draft.slug}” moves to <span className="mono">drafts/.trash</span>,
            images and figures included. Nothing is erased, and the site isn't touched
            {deleting?.draft.published ? " (the published page stays up)" : ""}.
          </p>
        }
        confirmLabel="Move to trash"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />

      {ready ? (
        <CoverPicker
          open={coverOpen}
          current={meta.cover}
          images={doc ? docImages(doc) : []}
          hint={
            meta.kind === "projects"
              ? "The card thumbnail and the page hero. 16:9 if you can."
              : "Shown at the top of the post and as its thumbnail."
          }
          resolveSrc={resolve}
          upload={upload}
          onPick={(src) => {
            session.updateMeta({ cover: src });
            setCoverOpen(false);
          }}
          onClose={() => setCoverOpen(false)}
        />
      ) : null}

      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
