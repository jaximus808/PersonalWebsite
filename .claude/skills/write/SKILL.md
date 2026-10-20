---
name: write
description: Jaxon's local writing tool ("the writer") for jaxonp.com blog posts and project write-ups, plus the Anatomy figures inside them. Use when they say "start my blog writing", "open the writer", "let's write", "write a post", "new post", "write up a project", "new project write-up", "what drafts do I have", "import <post> into the writer", "build the figures (for <slug>)", "make the diagrams", "build my draft", "publish my draft", "put it on the blog", or "stop the writer". It starts the local editor on http://localhost:4310, creates and opens drafts, builds the Anatomy figure requests in a draft, and turns a finished draft into content/<kind>/<slug>.mdx and the site page. For a quick edit straight to an existing .mdx file without the writer, use the publish skill instead.
---

# The writer

A local editor that looks like the site. Jaxon writes and formats there
(headings, lists, code, tables, images, galleries, video, callouts, pull
quotes, and requests for Anatomy figures) without typing markdown. It autosaves
to disk. When they say the piece is ready, you build it into the site.

Never deployed. Lives in `tools/writer/` with its own `package.json`; the
site's build and type-check ignore it. Its spec is `tools/writer/SPEC.md`, the
site's content rules are `content/README.md`, and the commit rules are in the
publish skill (`.claude/skills/publish/SKILL.md`). Read those as you need them.

```
tools/writer/drafts/<kind>/<slug>/     (gitignored; kind is blog or projects)
  meta.json      title, date, cover, summary, links, … (frontmatter)
  doc.json       the editor's document (source of truth)
  draft.mdx      what content/<kind>/<slug>.mdx will be, rewritten on every save
  anatomy.json   the figure requests in the draft
  assets/        images and videos they dropped in
  figures/       <id>.html built figure pages, <id>/build.mjs their sources
```

## Start the writer

1. If `tools/writer/node_modules` is missing, run `npm --prefix tools/writer install`.
2. Check whether it is already running:
   `curl -sf -o /dev/null http://localhost:4310/api/drafts && echo up`.
   If it answers, reuse it. Otherwise start it with the Bash tool's
   `run_in_background`: `npm --prefix tools/writer run dev`, and wait (up to
   about 20 s) until that curl answers. If the port is taken by something
   else, say so rather than killing it.
3. If they named a piece, create the draft (otherwise skip to step 4):
   - Kind: a post is `blog`, a project write-up is `projects`. Ask only if it
     really isn't clear.
   - Slug from the title: lowercase a–z, 0–9 and single hyphens, at most 80
     characters. Check it against the site (`curl -s localhost:4310/api/site`)
     and their drafts (`curl -s localhost:4310/api/drafts`); if a published
     page already uses it, ask whether they mean to edit that one (step 5).
   - `curl -s -X POST localhost:4310/api/drafts -H 'content-type: application/json' -d '{"kind":"blog","slug":"<slug>","title":"<Title as they said it>"}'`.
     A 409 means the draft exists: just open it. (Without the server:
     `npm --prefix tools/writer run --silent new-draft -- <kind>/<slug> "<Title>"`,
     which reports an existing draft instead of failing.)
4. Open it: `open "http://localhost:4310/?draft=<kind>/<slug>"` (or plain
   `http://localhost:4310/` for the drafts list).
5. To edit something already on the site in the writer:
   `curl -s -X POST localhost:4310/api/import -H 'content-type: application/json' -d '{"kind":"projects","slug":"<slug>"}'`,
   then open it. It copies the page's images into the draft.
6. Tell them in a line or two: the URL, that it autosaves, that `/` opens the
   block menu (images, gallery, video, code, callout, Anatomy figure, …), and
   that they should come back and say "build the figures" or "build my draft".

To stop it: if you started it in this session, stop that background task;
otherwise `lsof -ti tcp:4310 | xargs kill`. The writer saves on every pause
and keeps unsaved changes in the browser too, but glance at its "Saved" state
(or ask) before you stop it mid-session.

## Build the figures

An Anatomy block in the draft is a request: an id (`fig-1`, …), a title,
"what should it show" in Jaxon's words, a caption and a size. You build each
one as a standalone dark page with the anatomy skill; the writer and the site
both show it in a frame (`<Diagram>` on the site).

1. List them: `npm --prefix tools/writer run --silent figures -- <kind>/<slug>`
   (works without the server and prints the exact `file` each page must be
   written to), or `curl -s localhost:4310/api/drafts/<kind>/<slug>/figures`.
   Work on the ones with `"built": false`, or the one they name. Read
   `draft.mdx` around each request too: the text says what the figure is for.
2. Load the anatomy skill (Skill tool, `anatomy`) and follow its workflow in
   full. It is the quality bar; nothing here relaxes it.
3. **Size.** The request's `size` picks the anatomy tier:
   - `figure` → **Figure** (one mechanism, 40–80 parts). Name the size and
     build it; don't quote a time.
   - `hero` → **Hero** (80–150 parts, about 2–4 hours). Tell them that
     estimate first, then build unless they asked for something quick.
   - If what they asked for is really an **Epic** (a whole vehicle, building or
     plant with many moving systems), don't start: give the estimate, propose
     a Hero that keeps the core idea, and wait for their choice.
   With several requests, build them one at a time and say which is next.
4. **Truth.** Every number the figure shows (readout, ticks, counts, caption)
   comes from the draft or from Jaxon. If the figure needs a number they haven't
   given (a latency, a rate, a part count), ask; never make one up.
5. **Where the files go.** Use the framework-free path: one build script per
   figure, kept with the draft so it can be rebuilt.
   ```
   tools/writer/drafts/<kind>/<slug>/figures/<id>/build.mjs   (and any model.mjs, geometry.mjs beside it)
   tools/writer/drafts/<kind>/<slug>/figures/<id>.html        (what it writes; the writer and the site use this)
   ```
   Start from the anatomy example closest to the idea, and write the page
   with this skill's `figure-page.mjs` instead of calling `pageHtml` and
   `writeFileSync` yourself:
   ```js
   import * as k from "../../../../../../../.claude/skills/anatomy/kit/iso-kit.mjs";
   import { kitScript } from "../../../../../../../.claude/skills/anatomy/scripts/inline-kit.mjs";
   import { figurePage, writeFigure } from "../../../../../../../.claude/skills/write/figure-page.mjs";
   // … geometry, svg, live script as in the anatomy examples …
   const body = k.plateHtml({ fig: "Fig 1", title: "…", hint: "…", readout: "…", keys: [/* … */], body: stageHtml });
   writeFigure(import.meta.url, figurePage({ title: "…", body, script: kitScript() + live }));
   ```
   - Dark theme only (the site is dark). No `--light` build is needed.
   - `fig` is `Fig n`, n being the figure's position among the draft's
     requests; `title` is the request's title (short; it sits in a corner).
   - Leave `caption` out of `plateHtml`: the request's caption is rendered
     under the frame by `<Diagram>`, like every caption on the site. Legend
     `keys` stay on the card.
   - `figurePage` makes the page transparent and lets the card fill the frame;
     `<Diagram>` sizes the frame to the page's height. Don't add margins,
     a page background or a fixed width.
   - Reduced motion and pausing offscreen are the figure page's job, as the
     anatomy skill already requires.
   - Run it with `node tools/writer/drafts/<kind>/<slug>/figures/<id>/build.mjs`
     (and `--audit` if it records shapes). Put screenshots in
     `figures/<id>/shots/`; only `<id>.html` is ever published.
6. **Check it** the way the anatomy skill says (capture at desktop and 390
   wide, reduced motion, the line check, the audit), on the built `<id>.html`.
   Then confirm the writer sees it: the figures call above now shows
   `"built": true`.
7. Tell them it's ready to look at in the writer (the Anatomy block now shows
   the live figure; Preview shows it as the site will). For changes, edit the
   build script and run it again; if they rewrite the request's prompt in the
   writer, the figure needs rebuilding.

## Build the draft into the site

Only when they say it's ready ("build my draft", "publish the draft", "put it on
the blog"). The writer autosaves, but make sure their last edits are in: ask, or
check that `draft.mdx` reflects what they just described.

1. **Branch.** Check `git status`. Work on a branch off `main`
   (`git switch -c <kind>/<slug> main`, or the branch they name). If the tree
   has unrelated uncommitted changes, ask before switching.
2. **Dry run.** `npm --prefix tools/writer run --silent build-draft -- <kind>/<slug> --dry-run`.
   It prints a JSON summary (`ok`, `errors`, `warnings`, `missingFigures`,
   `copied`, `downloaded`, `overwrote`) and exits 0 when it would build, 1
   when it stops (nothing written), 2 on bad arguments. Every check runs
   before the first write, so a stopped build changes nothing.
   - Lint errors (missing title, date or project summary, empty figures,
     one-image galleries, links without http(s)): tell them what's missing and
     let them fix it in the writer. Don't fill in a summary, date or link
     yourself.
   - Unbuilt figures (`missingFigures`): build them first (above). Don't
     publish a page whose `<Diagram>` points at a figure that doesn't exist;
     `--allow-unbuilt-figures` is only for a deliberate test build.
   - Remote (`http…`) images and videos: the build downloads each into
     `public/<kind>/<slug>/` and points the page at the local copy (listed
     under `downloaded`); a failed download stops the build. Never hotlink;
     `--keep-remote` exists only for a deliberate exception they ask for.
   - Warnings don't block. Mention the ones worth their attention (no cover, an
     image with neither alt text nor caption).
3. **Build.** Run it without `--dry-run`. It refuses to overwrite an existing
   `content/<kind>/<slug>.mdx`; when they are updating a published page, confirm
   that, run with `--force`, and look at `git diff` on that file (`--force`
   also warns about frontmatter keys the old file had that the new one
   drops). It copies assets to `public/<kind>/<slug>/` and figures to
   `public/<kind>/<slug>/figures/`. It never deletes anything in `public/`;
   identical files are skipped, and a different file with the same name is
   only replaced with `--force` (`"action": "replace"` in `copied`).
4. **Editorial pass, formatting not voice,** directly in
   `content/<kind>/<slug>.mdx`:
   - alt text for images that have none, describing only what the image
     visibly shows (open the image and look);
   - heading levels that start at `##` and don't skip;
   - link text that says where it goes instead of "here" or a bare URL;
   - a language on every code block; tidy lists and tables.
   Keep their words, sentences and captions. Don't add claims, numbers, links
   or sections. Note each change so you can tell them, and so you can reapply
   them if they edit more in the writer and you rebuild with `--force`.
5. **Check.** `npm run build` must pass. Then look at the page:
   `npm run dev` (reuse it if port 3000 already answers) and open
   `/blog/<slug>` or `/projects/<slug>`. These pages have no 3D stage, so the
   headless browser works. Look at it at desktop and phone width: images in
   their frames, figures loaded and sized (no inner scrollbar, no clipped
   card), code blocks, captions.
6. **Show them** the new file, the files copied into `public/`, a screenshot,
   and the editorial changes you made.
7. **Publish** by the publish skill's rules: commit when they say so. Pushing,
   opening a PR or merging to `main` makes it public, so ask first every time;
   an approval for one piece doesn't carry over to the next.

## Rules

- Never invent facts: no dates, numbers, links, names, quotes, captions, alt
  text beyond what an image shows, or figure readouts they didn't give you.
  Ask for what's missing.
- Fix formatting, not voice.
- Drafts stay in `tools/writer/drafts/` (gitignored). Only build-draft writes
  into `content/` and `public/`, and only when they ask for the build.
- Deleting a draft in the writer moves it to `tools/writer/drafts/.trash/`;
  nothing is hard-deleted.
