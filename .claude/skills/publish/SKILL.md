---
name: publish
description: Publish a new blog post or project to the live site (jaxonp.com) through its admin API. Use when the user asks to post, publish, or add a blog post or a project, or to check what is live.
---

# Publish to the site

Blog posts and projects are created through the site's admin API using
`site.mjs` in this directory. It talks to production (`https://www.jaxonp.com`)
unless `SITE_URL` is set.

```
node .claude/skills/publish/site.mjs <command>
```

| Command | What it does |
|---|---|
| `whoami` | Says whether a saved login token exists and is accepted. |
| `list blogs` / `list projects` | Shows what is live. No login needed. |
| `check <draft.md>` | Validates a draft and prints what would be sent. Sends nothing. |
| `publish <draft.md>` | Creates the post or project. Needs a login. |
| `login` / `logout` | The user runs these. See below. |

## Login: the user does it, not you

The password and the token must never pass through the conversation.

- Never ask the user for their username or password, and never accept one if
  offered in chat.
- Never run `login` yourself. It refuses to run without a real terminal.
- Never read, print, or copy the token file (`~/.config/jaxonp-site/`).

When `whoami` reports no token or a rejected one, ask the user to run this in
their own terminal (not with the `!` prefix, which has no interactive prompt),
then tell you when it is done:

```
node .claude/skills/publish/site.mjs login
```

The token lasts about two years, so this is rare.

## Writing a draft

Write the draft as a markdown file in the scratchpad directory, not in the
repo. The body is markdown: headings, lists, links, images, tables, and fenced
code blocks with a language all render. Raw HTML does not; it shows as text.
Start body headings at `##`, since the page supplies the title as the `h1`.

Blog post:

```markdown
---
type: blog
title: Claude Code is the future
image: https://example.com/cover.png
date: 2026-09-28
---
Body in markdown.
```

Project:

```markdown
---
type: project
name: Tandem Canvas
summary: A shared task board that humans and agents edit together.
image: https://example.com/shot.png
links: https://github.com/jaximus808/tandem, https://tandemcanvas.com
linkName: GitHub
featured: true
date: 2026-05-01
---
Full description in markdown.
```

Field notes:

- `date` is optional and defaults to now. Use `2026-09-28` or `2026-09-28T14:30`.
- `image` must be a public http(s) URL. The site does not host uploads, so ask
  the user for a URL rather than inventing one.
- Blog `title`, body, and `image` must each be unique across all posts. Reusing
  a cover image from another post is rejected by the site.
- Project `name` becomes the URL; spaces are stored as underscores.
- For a project video, replace `image` with `youtube: <video id>` (the id only).
- `links` is a comma-separated list. `linkName` is used only when there is
  exactly one link; otherwise each link is labelled by its site.
- `featured: true` marks a project as a favorite.

## Publishing

Publishing is public and there is no edit endpoint, so a mistake can only be
fixed by deleting and re-posting on the site itself.

1. Get the content from the user. Do not invent facts, dates, links, or images
   for them; ask for what is missing.
2. Write the draft and run `check`. Fix any problems it reports.
3. Show the user the full draft (header and body) and the target site, and wait
   for an explicit yes. An earlier approval does not carry over to a changed
   draft or to a different post.
4. Run `whoami`. If it fails, follow the login section.
5. Run `publish`. It refuses if something with the same title or name is
   already live.
6. Report the result exactly as printed, including the live URL. The public
   list is cached for about a minute, so a new entry may not appear at once;
   say so rather than reporting a failure, and re-run `list` after a minute.

This skill does not delete or edit. If the user wants something removed, point
them to the delete control on that post or project's page while logged in.

## Testing against a local server

```
SITE_URL=http://localhost:3000 node .claude/skills/publish/site.mjs whoami
```

Tokens are stored per site, so a local login is never sent to production.
