# CLAUDE.md

## Design Language (redesign — source of truth)

**North star:** elegant, spacious, full of wonder & curiosity — "a look into my mind." Restrained like Cursor's aesthetic. **Never** vibecoded / generic-template. Study the *UX* of https://andrewvu.me/ (flow, pacing) but explicitly reject its visual look.

**Typography**
- **Display / wordmark:** `font-cormorant` (Cormorant, weight 300 light) — high-contrast elegant serif. Used for the hero name and major section headings. This is the site's signature voice; keep it light and let it breathe.
- **Body / UI:** `font-montserrat` (weight 300–400). Clean, quiet. Small labels/eyebrows: uppercase, wide tracking (`tracking-[0.18em]`), `text-white/60`.
- **Mono accent:** `font-mono`, used sparingly on the landing page for the hero tagline, plain-text links, and the numbered section labels. Not for body copy.
- **Legacy:** Tourner (`font-tourner`) and Caviar Dreams (`font-caviar`) are being phased out — do not add new usages.

**Color (on the dark 3D stage)**
- Base background `#121212`. Primary text `white`; secondary `text-white/60–70`.
- Single restrained accent: soft blue (`text-blue-300` / `#a3cbff`) for links & hovers. Avoid the loud purple/magenta gradient borders in new work — they read as the old style.

**Space & rhythm:** generous whitespace, large hero, calm vertical cadence. Prefer air over density.

**Motion:** subtle and slow (200–1500ms, ease-out). Purposeful only — no bouncy/childish effects. Always honor `prefers-reduced-motion` (see `components/Typewriter.tsx` for the pattern).

**Landing hero:** `components/HeroIntro.tsx` — left-aligned and static: headshot, the name, a two-line mono tagline ("Building robots, and the infrastructure that runs them."), a row of plain links, and a numbered page index (01 About … 04 Writing). No random or location-aware greetings. The header stays hidden until the hero scrolls off (`<Header hideOnHero />`) so the name isn't shown twice. The particle stage sits right of the text on wide screens (`<Background offsetRight />`) and scatters and fades out as the hero leaves (`fadeOnScroll`, `lib/useHeroFade.ts`). Each home section opens with `components/SectionHead.tsx` (numbered mono label + hairline + left-aligned Cormorant title).

**Typing effects (currently unused):** `components/Typewriter.tsx` (type once, `onDone` callback) and `components/TypeErase.tsx` (type → hold → erase → type final). Reuse these rather than reinventing if typing ever comes back.

## Project quick reference

Personal website + portfolio. **Next.js 16 (Pages Router)** · TypeScript · Tailwind · MDX (next-mdx-remote) · Prisma (admin login only) + Supabase (finance) · Three.js. Deployed on Vercel.

- `pages/` — routes: `index.tsx`, `blog/` (`index.tsx`, `[slug].tsx`), `projects/` (`index.tsx`, `[slug].tsx`), `chess.tsx`, `resume.tsx`, `contact.tsx`; `pages/api/`, `pages/admin/`.
- `content/` — **every blog post and project is an MDX file here** (`content/blog/<slug>.mdx`, `content/projects/<slug>.mdx`), images in `public/blog/<slug>/` and `public/projects/<slug>/`. Read `content/README.md` before adding or editing one. Loaded by `lib/content.ts` at build time; no database.
- `components/content/` — the shared MDX components (`Figure`, `Gallery`, `Video`, `Divider`, `PullQuote`, `Callout`) and one-off embeds in `embeds/`. Every image goes through the same `Frame` so pages stay consistent.
- `components/` — `header.tsx`, `footer.tsx`, `backgroundThree.tsx`, `gradientbg.tsx`, `techStack.tsx`, `myPath.tsx`, `chess/`, `finance/`.
- `lib/`, `prisma/`, `supabase/`, `styles/`, `public/`.

**Commands:** `npm run dev` · `npm run build` (`prisma generate && next build`) · `npm run lint`

**Conventions:** Pages Router (not App Router). Prettier + ESLint configured — match surrounding style. Branch off `main`; confirm before pushing or deploying.

**Verifying the landing page (`/`):** The Three.js `<Canvas>` in `components/backgroundThree.tsx` can't get a WebGL context under **headless** Chromium (SwiftShader → `WebGLRenderer: A WebGL context could not be created`). In Next dev, that error bubbles to the dev-overlay error boundary and unmounts the **whole** page tree, so anything below the Canvas (MyPath, TechStack, etc.) never renders — a headless `/gstack browse` or screenshot of `/` will look blank/broken even when the code is fine. This is an environment limit, not a bug. To verify `/` visually, use **headed** mode (`browse --headed`, needs a real GPU; on this Mac start it clean: `browse stop` → `browse --headed status` → `goto`) or just ask the user to review in their own browser. Pages without the 3D stage verify fine headless. Also note: `npm run lint` is currently misconfigured (passes `lint` as a dir and errors) — use `npx tsc --noEmit` to type-check instead.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
