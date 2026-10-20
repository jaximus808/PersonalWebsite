# The writer

A local writing tool for jaxonp.com blog posts and project write-ups. It looks
like the site: you write in a rich editor (headings, lists, code, tables,
images, galleries, video, callouts, pull quotes) without typing markdown, drop
images straight in, and ask for Anatomy figures where a picture would explain
better than a paragraph. Everything autosaves to disk. When a piece is ready,
Claude builds it into `content/<kind>/<slug>.mdx` and `public/<kind>/<slug>/`,
and from there it is an ordinary post.

**It is never deployed.** Nothing in the Next.js app imports it, the site's
build and type-check skip `tools/writer`, and drafts are gitignored. It only
ever runs on your machine, on localhost.

## Running it

The usual way is to ask Claude ("start my blog writing", "open the writer",
"new project write-up"); the `write` skill starts it and opens the right draft.
By hand, from the repo root:

```sh
npm --prefix tools/writer install      # once
npm --prefix tools/writer run dev      # http://localhost:4310
```

Open `http://localhost:4310/?draft=blog/my-post` to go straight to a draft.
The editor and its file API share that one port (the API is a Vite plugin), so
there is nothing else to start.

If the dev server logs that it cannot find the site repo, it is being run from
somewhere other than `tools/writer` inside the repo; publishing and "Import
from site" need `content/` and `public/` three folders up from `server/`.

## Where things live

```
tools/writer/
  index.html, vite.config.ts     the dev server (port 4310)
  src/shared/types.ts            the contract: draft, document nodes, API shapes
  src/mdx/                       doc ⇄ MDX: export, import, lint (pure functions)
  src/editor/                    the TipTap editor and its blocks
  src/app/, src/styles/          the shell: drafts list, details, preview
  server/                        the file API (Vite plugin) and draft storage
  scripts/                       build-draft, new-draft, figures (run with tsx)
  drafts/                        your drafts (gitignored)
```

Each draft is a folder:

```
drafts/<kind>/<slug>/          kind is blog or projects
  meta.json      title, date, cover, summary, links, … (the frontmatter)
  doc.json       the editor's document; the source of truth
  draft.mdx      what content/<kind>/<slug>.mdx will be, rewritten on every save
  anatomy.json   the figure requests in the draft, with built flags
  assets/        images and videos you dropped in
  figures/       <id>.html: built Anatomy figures (plus their build sources)
drafts/.trash/   deleted drafts, moved here (kind-slug-timestamp), never erased
```

Every file is written to a temp file and renamed into place, so a crash never
leaves half a document. Deleting a draft in the writer moves it to `.trash/`;
to bring one back, move its folder back to `drafts/<kind>/<slug>`.

Image paths inside a draft are one of:

- `assets/<file>`: uploaded to this draft. Published to `/<kind>/<slug>/<file>`.
- `/blog/...` or `/projects/...`: already on the site, used as is.
- `http(s)://...`: a remote image. Fine while writing; the build downloads it
  so the site never hotlinks.

## Building a draft into the site

```sh
npm --prefix tools/writer run build-draft -- blog/my-post --dry-run
npm --prefix tools/writer run build-draft -- blog/my-post
```

It checks everything first and only then writes, so a stopped build leaves
the repo as it was:

1. **Lint.** Missing title or date (or summary, for a project), duplicate
   figure ids, empty figures, one-image galleries: these stop the build.
   Softer problems (no alt text, no cover, remote images) come back as warnings.
2. **Figures.** Every Anatomy request needs its `figures/<id>.html`. Missing
   ones are listed and stop the build, unless `--allow-unbuilt-figures`.
3. **No surprise overwrites.** An existing `content/<kind>/<slug>.mdx` is only
   replaced with `--force`. Overwriting also warns when the old file had
   frontmatter the new one drops (like `legacyId`, which feeds old-URL
   redirects).
4. **Copy.** Referenced assets go to `public/<kind>/<slug>/`, built figures to
   `public/<kind>/<slug>/figures/<id>.html`, and remote images are downloaded
   there (`--keep-remote` leaves them as links). Nothing already in `public/`
   is deleted; identical files are skipped, and a different file under the
   same name is only replaced with `--force`.
5. **Write** `content/<kind>/<slug>.mdx`, exactly what the writer's MDX panel
   showed (with downloaded images pointing at their local copies).
6. **Report.** A JSON summary on stdout: the output file, each copy (`copy`,
   `replace` or `unchanged`), downloads, missing figures, warnings and errors.
   Exit code 0 when it built (or would build, with `--dry-run`), 1 when it
   stopped, 2 for bad arguments.

After that, the `write` skill does a light editorial pass on the written file
(formatting, not voice), runs the site's `npm run build`, looks at the page,
and follows the publish skill's rules for branches and pushing.

## Command-line helpers

For Claude (or you) when the editor isn't open; the dev server reads the
drafts folder fresh on every request, so these are safe to run alongside it.

```sh
npm --prefix tools/writer run --silent new-draft -- blog/my-post "My post"
npm --prefix tools/writer run --silent new-draft -- projects "Hand tracking arm"   # slug from title
npm --prefix tools/writer run --silent figures -- blog/my-post
```

`new-draft` leaves an existing draft alone and says so. `figures` prints each
Anatomy request (id, title, prompt, caption, size, built) and the file its
built page goes to.

## The file API

Served by `server/api.ts` on the same port. JSON in and out, errors as
`{ "error": "…" }` with a fitting status (400 bad input, 404 missing, 409
already exists, 413 too large, 415 not an image or video).

| | |
|---|---|
| `GET /api/drafts` | all drafts, newest first |
| `POST /api/drafts` | `{ kind, slug, title }` → new draft (409 if it exists) |
| `GET` / `PUT` / `DELETE /api/drafts/<kind>/<slug>` | load / save (writes all four files) / move to trash |
| `POST /api/drafts/<kind>/<slug>/assets?name=<file>` | raw bytes → `{ src, url }`, up to 200 MB |
| `GET /api/drafts/<kind>/<slug>/figures` | `{ figures, builtIds }`: requests with `built` read from disk, plus every built page's id (new requests never reuse one) |
| `GET /api/site` | every post and project on the site |
| `POST /api/import` | `{ kind, slug }` → a draft from a published page, its images copied in |
| `GET /drafts/<kind>/<slug>/assets/…`, `…/figures/…` | the draft's files (byte ranges for video) |
| `GET /site/…` | the repo's `public/` folder |

Kinds are `blog` and `projects`; slugs are lowercase letters, digits and
single hyphens, up to 80 characters. Every path is checked to stay inside the
drafts folder or the repo's `content/` and `public/`, and writes from any
origin other than the writer's own page are refused.

## Checks

```sh
cd tools/writer
npx tsc --noEmit -p .     # type-check
npx vitest run            # tests (they use temp folders, never your drafts or the site)
```
