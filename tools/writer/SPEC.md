# Writer: build spec

A local-only writing tool for jaxonp.com blog posts and projects. Jaxon writes
in a rich editor that looks like the site (no markdown typing), drops in images,
galleries, video, code, callouts and Anatomy figure requests; it autosaves to
disk. When he says "build it", Claude reads the draft and publishes it as
`content/<kind>/<slug>.mdx` plus files under `public/<kind>/<slug>/`.

Never deployed, never imported by the Next.js app. Runs with
`npm --prefix tools/writer run dev` on http://localhost:4310 (Vite dev server;
the file API is a Vite plugin on the same port).

Read `content/README.md` (site content rules) and `components/content/*` (the
site's MDX components) before working on export, preview, or the editor's
blocks. The shared contract is `src/shared/types.ts`; do not change node
names, mark names, attrs, or API shapes without updating every owner.

## Files and owners

```
tools/writer/
  SPEC.md, package.json, tsconfig.json, vite.config.ts, index.html  (fixed scaffold)
  src/shared/types.ts      contract (fixed; add, don't break)
  src/mdx/**               MDX agent: serialize, parse, lint, tests
  src/editor/**            EDITOR agent: TipTap editor, custom nodes, menus, paste/drop
  src/app/**, src/main.tsx, src/styles/**   APP agent: shell, panels, preview, autosave, styling
  server/**, scripts/**    SERVER agent: file API (Vite plugin), storage, build-draft script, tests
  README.md                SERVER agent (how to run, where things live)
repo (outside tools/writer)  SITE agent: Diagram component, skill, docs, ignores
```

Stay inside your files. If you need something from another owner, code
against the contract here and note the assumption in your final report.

## Draft storage (server)

```
tools/writer/drafts/<kind>/<slug>/
  meta.json      DraftMeta
  doc.json       TipTap JSON (lossless editor state)
  draft.mdx      draftToMdx(meta, doc): what the site file will be
  anatomy.json   FigureRequest[] (figureRequests(doc) + built flags)
  assets/        uploaded images/videos (safe, unique filenames)
  figures/       <id>.html built by Claude with the anatomy skill
tools/writer/drafts/.trash/   deleted drafts (moved, never hard-deleted)
```

Slug: lowercase a-z0-9 and single hyphens, 1–80 chars. Kind: `blog` | `projects`.
Reject anything else (no path traversal; resolve and check every path stays
under drafts/ or the repo's content/ and public/).

## API (server/api.ts, Vite `configureServer` middleware, JSON unless noted)

| Method | Path | Body / result |
|---|---|---|
| GET | `/api/drafts` | `{ drafts: DraftSummary[] }`, newest `updatedAt` first |
| POST | `/api/drafts` | `CreateDraftBody` → `DraftFile` (201). 409 if the draft exists. Today's date, empty doc (one empty paragraph). |
| GET | `/api/drafts/:kind/:slug` | `DraftFile` |
| PUT | `/api/drafts/:kind/:slug` | `SaveDraftBody` → `SaveDraftResult`. Writes meta.json, doc.json, draft.mdx, anatomy.json atomically (write temp + rename). Bumps updatedAt. If draftToMdx throws, still save doc/meta and return 200 with `mdx: ""` plus `error`. |
| DELETE | `/api/drafts/:kind/:slug` | moves the folder to drafts/.trash/<kind>-<slug>-<timestamp> |
| POST | `/api/drafts/:kind/:slug/assets?name=<filename>` | raw bytes (any image/video type) → `UploadResult`. Max 200 MB. Sanitize name, keep extension, dedupe with -2, -3. |
| GET | `/api/drafts/:kind/:slug/figures` | `{ figures: FigureRequest[] }` (anatomy.json with `built` recomputed from disk) |
| GET | `/api/site` | `{ entries: SiteEntry[] }` from content/blog and content/projects frontmatter (gray-matter not installed here: parse with the `yaml` package) |
| POST | `/api/import` | `{ kind, slug }` → `DraftFile`: mdxToDraft on content/<kind>/<slug>.mdx, copy the referenced public/<kind>/<slug>/ files into assets/. 409 if a draft exists. |
| GET | `/drafts/<kind>/<slug>/<path>` | static file from the draft folder (assets, figures), correct content-type, Range support for video |
| GET | `/site/<path>` | static file from the repo's public/ (so a doc can show existing "/blog/x/1.jpg" images: the editor maps site paths to `/site/...`) |

Repo root = `path.resolve(__dirname-of-server, "../../..")`; verify it contains
`content/` and `public/` at startup and log a clear error otherwise.

## Image paths

In the doc (`figure.src`, `gallery.images[]`, `video.src/poster`, `meta.cover`):
- `assets/<file>`: uploaded to this draft. Editor shows `/drafts/<kind>/<slug>/assets/<file>`. Export writes `/<kind>/<slug>/<file>`.
- `/blog/...`, `/projects/...`: already on the site. Editor shows `/site/blog/...`. Export unchanged.
- `http(s)://...`: remote. Allowed in the editor; `lint` warns (publish skill says never hotlink; build downloads it).

Anatomy figures export to `/<kind>/<slug>/figures/<id>.html`; build copies
`drafts/.../figures/<id>.html` there.

## Export: doc → MDX (src/mdx)

Must compile with the site's pipeline: `@mdx-js/mdx` `compile` with
`remarkPlugins: [remarkGfm]` (the site uses next-mdx-remote with remark-gfm,
rehype-highlight, blockJS false). Tests must compile every fixture.

Frontmatter (YAML via the `yaml` package, keys in this order, omit empty):
- blog: `title`, `date`, `cover`
- projects: `title`, `date`, `summary`, `cover`, `youtube`, `featured` (only if true), `links`, `hideCover` (only if true)
Dates stay unquoted `YYYY-MM-DD` like the existing files (check content/ for the house style and match it).

Body (blank line between blocks, no trailing spaces, ends with one newline):

| Node | MDX |
|---|---|
| paragraph | inline text. Escape MDX-significant characters in text: `{` `}` `<` and markdown specials where they'd change meaning (`*`, `_`, `` ` ``, `[`, `]`, leading `#`, `>`, `-`, `+`, `1.`, `|` inside tables). |
| heading 2/3/4 | `##` / `###` / `####` |
| bold / italic / strike / code / link | `**x**` / `_x_` / `~~x~~` / `` `x` `` (longer fence if the code contains backticks) / `[x](href)` |
| hardBreak | `\` + newline |
| bulletList / orderedList / taskList | `- ` / `1. ` (respect start) / `- [ ] ` / `- [x] `, nested lists indented, tight |
| blockquote | `> ` prefixed lines |
| codeBlock | fenced ``` with language; fence longer than any backtick run inside |
| table | GFM table; first row is the header (tableHeader cells); escape `|` |
| figure | `<Figure src="…" caption="…" alt="…" ratio="wide" fit="cover" />`, omitting defaults (ratio standard, fit contain) and empty strings |
| gallery | `<Gallery images={["…","…"]} caption="…" columns={3} />` |
| video | `<Video youtube="id" />` or `<Video src="…" poster="…" loop />` |
| callout | `<Callout title="…">` blank line, children as MDX, blank line `</Callout>` |
| pullQuote | `<PullQuote cite="…">inline MDX</PullQuote>` |
| divider | `<Divider />` or `<Divider label="…" />` |
| anatomy | `<Diagram src="/<kind>/<slug>/figures/<id>.html" title="…" caption="…" size="hero" />` (size only when hero) |

Attribute strings: emit `attr="..."` when the value has no `"` or `{`/`}`
issues; otherwise `attr={"…"}` via JSON.stringify. Prove both compile.

Import (`mdxToDraft`): parse with unified + remark-parse + remark-mdx +
remark-gfm + remark-frontmatter, map everything above back (markdown images
alone on a line become figure; `<Diagram>` becomes anatomy with id from the
filename; unknown JSX (e.g. `<TandemBoardDemo />`) becomes a paragraph-level
codeBlock with language "mdx" holding the raw source so nothing is lost).
Round-trip test: every file in the repo's content/blog and content/projects
must survive mdx → draft → mdx with the same compiled output (or a
documented, harmless normalization).

`lint`: errors for missing title/date (and summary for projects), duplicate
anatomy ids, figures with no src, galleries with < 2 images; warnings for
remote (http) images, images without alt or caption, empty headings, no cover.

## Editor (src/editor)

`src/editor/DraftEditor.tsx`:

```ts
export interface DraftEditorProps {
  draftKey: string;                         // "<kind>/<slug>", remount on change
  initialDoc: DraftDoc;
  kind: Kind; slug: string;
  onChange(doc: DraftDoc): void;            // every transaction that changes the doc
  onReady?(editor: Editor): void;
  upload(file: File): Promise<UploadResult>; // provided by the app (calls the API)
  resolveSrc(src: string): string;           // doc path -> browser URL (provided by the app)
  figures: FigureRequest[];                  // built status, refreshed by the app
}
export default function DraftEditor(props: DraftEditorProps): JSX.Element
```

Must have:
- StarterKit (headings 2–4 only, no h1; its horizontalRule replaced by `divider`), Link (autolink, paste URLs onto selection), Placeholder, Typography, CharacterCount, TaskList/TaskItem, Table (resizable off), CodeBlockLowlight (common languages, highlighted), Dropcursor/Gapcursor, history.
- Custom nodes from the contract, each a React node view styled like the site component it becomes: figure (image in a 3:2/16:9/… frame, editable caption below, toolbar on select: ratio, fit, alt, replace, delete), gallery (grid, add/remove/reorder images, caption, columns), video (YouTube id or uploaded file, preview), callout (editable title + rich content), pullQuote (Cormorant, editable cite), divider (optional label), anatomy (dashed card: title, "What should it show?" prompt textarea, caption, size; shows an iframe of the built figure when `figures` says built, else a "requested" state with the hint: ask Claude "build the figures for <slug>").
- Slash menu (`/` at line start or after space): Heading 2/3/4, Bulleted, Numbered, Checklist, Quote, Code, Table, Image, Gallery, Video, Callout, Pull quote, Divider, Anatomy figure. Filter as you type, arrow keys, Enter, Esc.
- Bubble menu on text selection: bold, italic, strike, code, link (inline input), H2, H3, quote.
- Markdown shortcuts work (StarterKit input rules: `## `, `- `, `1. `, `> `, ``` ``` ```, `---` → divider, `[ ] ` → task).
- Paste/drop: image files upload and insert a figure (several at once → gallery); a pasted YouTube URL on an empty line → video; a pasted image URL → figure with that src; pasted markdown text (multi-line with markdown syntax) → converted via the mdx parser's body path if feasible, else plain.
- Drag handle to move blocks.
- Keyboard: Cmd+B/I/E(code)/K(link), Cmd+Alt+2/3/4 headings, Tab/Shift+Tab in lists and code.
- Ids: anatomy nodes get a unique id on insert (`fig-1`, `fig-2`, …, never reused within the doc).

## App (src/app, src/main.tsx, src/styles)

- Site look: background `#121212`, text white/70–90, Cormorant 300 for the title and headings, Montserrat 300 body at the site's article size and measure, soft blue accent `#a3cbff`, hairlines `white/10`. Content styles in `src/styles/prose.css` mirror `components/content/prose.module.css` (the editor applies the class `prose` to its content; the preview uses the same class). Restrained motion; honor prefers-reduced-motion.
- Layout: left rail (drafts: Blog / Projects tabs, search, "New" with kind + title → slug suggestion, "Import from site" list from /api/site, delete with confirm in-app, not window.confirm); center column: big title input (Cormorant), then the editor; right panel (collapsible): Details (frontmatter form per kind: date, cover picker/upload, summary, youtube, featured, links editor, hideCover), Outline (headings, click to scroll), Figures (anatomy requests + built state), Checks (`lint`), MDX (live `draft.mdx` text, copy button).
- Top bar: kind/slug, save state ("Saving…", "Saved 12:04", "Offline: kept locally"), words + reading minutes (200 wpm), Preview toggle.
- Autosave: debounce 700 ms after change and on blur/visibility change; Cmd+S saves now; also keep the last unsaved state in localStorage per draft and offer to restore it if newer than the server copy.
- Preview mode: render the exported MDX body with `@mdx-js/mdx` `evaluate` (+ remark-gfm) in the browser, using preview versions of Figure, Gallery, Video, Callout, PullQuote, Divider, Diagram that look like the site's (dark, same frames and captions, Diagram = iframe of the built figure or a "not built yet" placeholder). Images map through `resolveSrc`. Title, date and cover on top like the site's post page.
- URL state: `?draft=<kind>/<slug>` selects the draft (so the skill can open a specific draft).
- Empty state: a calm screen with "New post" / "New project" / "Import".

## build-draft (scripts/build-draft.ts, `npm run build-draft -- <kind>/<slug> [--force] [--allow-unbuilt-figures] [--dry-run]`)

1. Load meta/doc; run `lint`; stop on errors (print them).
2. Anatomy: every request must have figures/<id>.html unless `--allow-unbuilt-figures`; stop listing the missing ids.
3. Refuse to overwrite an existing content/<kind>/<slug>.mdx unless `--force`.
4. Copy referenced assets → public/<kind>/<slug>/<file> and figures → public/<kind>/<slug>/figures/<id>.html. Don't delete anything already there.
5. Write content/<kind>/<slug>.mdx = draftToMdx(meta, doc).
6. Print a JSON summary: written file, copied files, warnings. `--dry-run` prints the plan only.
Tests (vitest) cover all of this against a temp repo root (make the repo root injectable).

## Site side (SITE agent)

- `components/content/Diagram.tsx`: renders an Anatomy figure page (same-origin static HTML under public/) in an `<iframe>` the width of the text, lazy-loaded, no border, transparent background, titled for a11y, auto-height from the iframe document (ResizeObserver on its documentElement, fallback 16:10 ratio), optional `caption` (same caption style as Figure), `size="hero"` lets it go a bit wider than the text like the site's wide media if the article layout allows (check `prose.module.css`; if not, same width). Register in `components/content/MdxContent.tsx` and document in `content/README.md`.
- `.claude/skills/write/SKILL.md`: the skill Jaxon will invoke ("start my blog writing", "open the writer", "new project write-up", "build the figures for X", "build my draft", "publish the draft"). Steps: install deps if `tools/writer/node_modules` is missing; start the dev server in the background (reuse it if port 4310 answers); create the draft through the API when he names one; open the browser at `http://localhost:4310/?draft=<kind>/<slug>`. Figures: read anatomy.json, build each unbuilt request with the anatomy skill as a standalone dark-theme HTML page into the draft's figures/ folder, check it in a browser, and tell him to look in the writer. Build: run build-draft, then do an editorial pass that fixes formatting not voice (alt text, captions, heading levels, link text) directly in the written mdx, `npm run build` must pass, open `/blog/<slug>` or `/projects/<slug>` on `npm run dev` and look at it, then follow the publish skill's rules (branch, show him, ask before pushing). Never invent facts.
- Root `tsconfig.json`: exclude `tools/writer` (it has its own). Root `.gitignore`: nothing needed beyond tools/writer/.gitignore, but make sure `tools/writer/node_modules` and drafts never get committed. `CLAUDE.md`: one short paragraph under the quick reference about the writer and the skill.
- Confirm `npm run build` / `npx tsc --noEmit` at the repo root ignore tools/writer.
