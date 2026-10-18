# Content

Every blog post and project is one MDX file. Markdown for the writing, plus
the shared components below wherever you want an image, a video, or a break.
Each file becomes its own page at build time; there is no database.

```
content/blog/<slug>.mdx        →  /blog/<slug>
content/projects/<slug>.mdx    →  /projects/<slug>
public/blog/<slug>/            images for that post (cover.jpg, 1.jpg, …)
public/projects/<slug>/        images and videos for that project
```

The slug is the filename: lowercase, words joined with `-`. Lists are sorted by
`date`, newest first.

## Blog post

```mdx
---
title: "Claude Code is the future"
date: 2026-03-17
cover: "/blog/claude-code-is-the-future/cover.jpg"
---
The writing, in markdown. Start sections at `##`; the page supplies the title.

<Figure src="/blog/claude-code-is-the-future/1.png" caption="Optional caption" />
```

| Field   | Required | Notes |
|---------|----------|-------|
| `title` | yes | |
| `date`  | yes | `YYYY-MM-DD` |
| `cover` | no  | Shown at the top of the post and as its thumbnail. |

## Project

```mdx
---
title: "Tandem"
date: 2026-06-12
summary: "One or two sentences. Shown under the title and on the cards."
cover: "/projects/tandem/cover.jpg"
youtube: "ztsJ87zMOS0"
featured: true
links:
  - label: "GitHub"
    href: "https://github.com/jaximus808/andr"
---
The full write-up, in markdown.
```

| Field       | Required | Notes |
|-------------|----------|-------|
| `title`     | yes | |
| `date`      | yes | `YYYY-MM-DD` |
| `summary`   | yes | Plain text. |
| `cover`     | no  | Card thumbnail and page hero. Use a 16:9 image if you can. |
| `youtube`   | no  | Video id. Replaces the cover as the page hero (the cover stays the poster and thumbnail). |
| `featured`  | no  | `true` marks it Featured. |
| `links`     | no  | List of `{ label, href }`, shown under the summary. |
| `hideCover` | no  | `true` leaves the hero out, for a page whose body leads with its own media. |

`legacyId` / `legacyName` on migrated entries feed the redirects from the old
database URLs (see `next.config.js`). Leave them alone; new files don't need them.

## Components

Use these instead of raw `<img>` or one-off markup. Each one keeps every image
in the same framed box, so a page reads as one piece however the sources were
sized. They are registered in `components/content/MdxContent.tsx`, so no import
is needed.

**`<Figure>`**: one image.

```mdx
<Figure src="/blog/x/1.jpg" />
<Figure src="/blog/x/2.jpg" caption="The first prototype" />
<Figure src="/projects/x/board.png" ratio="wide" fit="cover" wide />
```

- `ratio`: `standard` 3:2 (default) · `wide` 16:9 · `square` · `tall` 4:5
- `fit`: `contain` (default) shows the whole image over a soft blurred fill;
  `cover` crops to fill the frame
- `wide`: runs wider than the text column on big screens
- A markdown image `![caption](/path.jpg)` on its own line renders as a Figure too.

**`<Gallery>`**: several images side by side, identical square frames.

```mdx
<Gallery images={["/blog/x/1.jpg", "/blog/x/2.jpg"]} caption="Before and after" />
<Gallery images={["/a.jpg", "/b.jpg", "/c.jpg"]} columns={3} />
```

**`<Video>`**: 16:9. YouTube loads only on click; files can loop silently.

```mdx
<Video youtube="ztsJ87zMOS0" />
<Video src="/projects/x/demo.mp4" poster="/projects/x/demo.jpg" loop wide />
```

**`<Divider />`** / **`<Divider label="Part two" />`**: a section break.

**`<PullQuote cite="optional">`**: lifts one line out of the text.

**`<Callout title="Update">`**: an aside or note.

**`<Wide>`**: wraps anything (a demo, a diagram) to run wider than the column.

### Project-specific embeds

Interactive pieces made for one page live in `components/content/embeds/` and
get added to the map in `MdxContent.tsx`. Example: `<TandemBoardDemo />`, a live
recreation of Tandem's claim race, used on `projects/tandem.mdx`. Honor
`prefers-reduced-motion` (see `lib/usePrefersReducedMotion.ts`).

## Checking your work

```
npm run build
```

The build compiles every MDX file and fails with the file name if frontmatter
is missing or a component is misspelled. `npm run dev` and open the page to
look at it.
