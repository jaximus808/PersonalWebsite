---
name: publish
description: Add or edit a blog post or project on the site (jaxonp.com). Posts and projects are MDX files in content/, published by committing them. Use when the user asks to post, publish, add, or edit a blog post or a project, or to check what is on the site.
---

# Publish to the site

Blog posts and projects are files in the repo, not database rows:
`content/blog/<slug>.mdx` and `content/projects/<slug>.mdx`, with images in
`public/blog/<slug>/` and `public/projects/<slug>/`. Read `content/README.md`
first: it has the frontmatter fields and the components to use.

## Writing

1. Get the content from the user. Do not invent facts, dates, links, or
   images; ask for what is missing. Keep their wording. Fix formatting, not
   voice.
2. Pick a slug (lowercase, hyphens) that no existing file uses.
3. Images: save them under `public/<blog|projects>/<slug>/` (`cover.jpg`,
   `1.jpg`, `2.png`, …) and reference them with `<Figure>`, `<Gallery>`, or
   `cover:`. If the user gives a URL, download the file into that folder
   rather than linking to the remote copy. Never hotlink.
4. Use the shared components instead of raw HTML so every image gets the
   same frame. If a page needs something new, add a component under
   `components/content/` and register it in `MdxContent.tsx` and the README.
5. To check what is on the site, list `content/blog/` and `content/projects/`.

## Checking

```
npm run build
```

It must pass. Then `npm run dev` and look at the page at `/blog/<slug>` or
`/projects/<slug>`. The page has no 3D background, so the headless browser works.

## Publishing

Publishing is a commit that reaches `main` and deploys on Vercel.

1. Work on a branch off `main`.
2. Show the user the new or changed file and the images you added.
3. Commit when they say so. Pushing, opening a PR, or merging to `main` makes
   the post public: ask first every time. An approval for one post does not
   carry over to the next.
