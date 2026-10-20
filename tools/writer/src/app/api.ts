// Client for the writer's local file API (server/api.ts, same origin).
// Every call either resolves with the contract's shape or throws ApiError,
// which says whether the server answered at all (offline) and with what.

import type {
  ApiError as ApiErrorBody,
  CreateDraftBody,
  DraftFile,
  DraftSummary,
  FiguresResult,
  Kind,
  SaveDraftBody,
  SaveDraftResult,
  SiteEntry,
  UploadResult,
} from "../shared/types";

/** The server's own upload limit (SPEC.md); checked here first to fail fast. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export class ApiError extends Error {
  /** HTTP status, or 0 when the request never got an answer. */
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }

  /** The dev server is down or unreachable; the work is only in this tab. */
  get offline(): boolean {
    return this.status === 0;
  }

  get notFound(): boolean {
    return this.status === 404;
  }

  get conflict(): boolean {
    return this.status === 409;
  }
}

/** A save result, plus the export error the server reports when draftToMdx throws. */
export type SaveResponse = SaveDraftResult & { error?: string };

function draftPath(kind: Kind, slug: string): string {
  return `/api/drafts/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}`;
}

async function errorFrom(response: Response): Promise<ApiError> {
  let message = `${response.status} ${response.statusText}`.trim();
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (body && typeof body.error === "string" && body.error) message = body.error;
  } catch {
    // Not JSON (a proxy page, an empty body): keep the status line.
  }
  return new ApiError(message, response.status);
}

async function request<T>(
  method: string,
  path: string,
  init: { body?: unknown; signal?: AbortSignal; keepalive?: boolean } = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
      keepalive: init.keepalive,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError("Can't reach the writer's server. Is `npm run dev` still running?", 0);
  }
  if (!response.ok) throw await errorFrom(response);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Upload progress, for the top bar. */
export type UploadProgress = { loaded: number; total: number };

/**
 * Raw-bytes upload through XHR rather than fetch: fetch can't report upload
 * progress, and a 150 MB screen recording deserves a progress bar.
 */
function upload(
  kind: Kind,
  slug: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<UploadResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return Promise.reject(
      new ApiError(`${file.name} is over 200 MB. Trim or compress it first.`, 413),
    );
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const name = file.name || `pasted.${(file.type.split("/")[1] || "bin").replace(/\W/g, "")}`;
    xhr.open("POST", `${draftPath(kind, slug)}/assets?name=${encodeURIComponent(name)}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      onProgress?.({ loaded: event.loaded, total: event.lengthComputable ? event.total : file.size });
    };
    xhr.onload = () => {
      let body: unknown;
      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : undefined;
      } catch {
        body = undefined;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body && typeof body === "object") {
        resolve(body as UploadResult);
        return;
      }
      const message =
        body && typeof (body as ApiErrorBody).error === "string"
          ? (body as ApiErrorBody).error
          : `Upload failed (${xhr.status || "no response"})`;
      reject(new ApiError(message, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Upload failed: the writer's server didn't answer.", 0));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));

    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

export const api = {
  async listDrafts(signal?: AbortSignal): Promise<DraftSummary[]> {
    const { drafts } = await request<{ drafts: DraftSummary[] }>("GET", "/api/drafts", { signal });
    return drafts;
  },

  createDraft(body: CreateDraftBody): Promise<DraftFile> {
    return request<DraftFile>("POST", "/api/drafts", { body });
  },

  getDraft(kind: Kind, slug: string, signal?: AbortSignal): Promise<DraftFile> {
    return request<DraftFile>("GET", draftPath(kind, slug), { signal });
  },

  saveDraft(
    kind: Kind,
    slug: string,
    body: SaveDraftBody,
    options: { keepalive?: boolean } = {},
  ): Promise<SaveResponse> {
    return request<SaveResponse>("PUT", draftPath(kind, slug), { body, keepalive: options.keepalive });
  },

  deleteDraft(kind: Kind, slug: string): Promise<void> {
    return request<void>("DELETE", draftPath(kind, slug));
  },

  uploadAsset: upload,

  listFigures(kind: Kind, slug: string, signal?: AbortSignal): Promise<FiguresResult> {
    return request<FiguresResult>("GET", `${draftPath(kind, slug)}/figures`, { signal });
  },

  async listSite(signal?: AbortSignal): Promise<SiteEntry[]> {
    const { entries } = await request<{ entries: SiteEntry[] }>("GET", "/api/site", { signal });
    return entries;
  },

  importEntry(kind: Kind, slug: string): Promise<DraftFile> {
    return request<DraftFile>("POST", "/api/import", { body: { kind, slug } });
  },
};

/** A message fit for the UI from anything a call can throw. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : "Something went wrong.";
}

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
