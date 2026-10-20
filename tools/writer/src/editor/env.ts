// What the editor needs from the app (uploads, URL mapping, figure status),
// shared two ways: React node views read it from context, and ProseMirror
// plugins (paste, drop) read it through a getter so they always see the
// latest props without the editor being rebuilt.

import { createContext, useContext } from "react";

import type { FigureRequest, Kind, UploadResult } from "../shared/types";

export type NoticeTone = "info" | "error";

export interface EditorEnv {
  kind: Kind;
  slug: string;
  upload(file: File): Promise<UploadResult>;
  /** Doc path ("assets/x.png", "/blog/x/1.jpg", "https://…") → browser URL. */
  resolveSrc(src: string): string;
  figures: FigureRequest[];
  /** A short message at the bottom of the editor (upload failed, etc.). */
  notify(message: string, tone?: NoticeTone): void;
}

/** Plugins hold this and call it at event time. */
export type EnvGetter = () => EditorEnv;

export const EditorEnvContext = createContext<EditorEnv | null>(null);

export function useEditorEnv(): EditorEnv {
  const env = useContext(EditorEnvContext);
  if (!env) throw new Error("useEditorEnv: rendered outside <DraftEditor>");
  return env;
}

/**
 * Where a built Anatomy figure is served from by the writer's dev server.
 * Not through resolveSrc: figures aren't doc paths, they live beside assets/.
 */
export function figureUrl(kind: Kind, slug: string, id: string): string {
  return `/drafts/${kind}/${slug}/figures/${encodeURIComponent(id)}.html`;
}

/** The sentence to say to Claude to get the figures built. */
export function buildFiguresPhrase(slug: string): string {
  return `build the figures for ${slug}`;
}
