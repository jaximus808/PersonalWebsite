# CLAUDE.md

## Tandem canvas — read this first, every session

This project is planned and tracked on a **Tandem canvas**. At the **start of every session**, before doing website work, connect to it and pull the current roadmap + context:

- **Canvas:** Personal Website — Roadmap & Context
- **Code:** `KB5J7FQL`
- **URL:** https://tandemcanvas.com/c/KB5J7FQL

**How to connect:**
1. Load the Tandem tool schemas via ToolSearch (`select:mcp__claude_ai_tandem__canvas_connect,mcp__claude_ai_tandem__canvas_state_read,mcp__claude_ai_tandem__agent_register,mcp__claude_ai_tandem__canvas_roadmap_task_list`).
2. `canvas_connect` with code `KB5J7FQL`. Keep the returned `session` handle and pass it on every later `canvas_*` call.
3. `agent_register` as `executor` (this doc's author registered as `planner`).
4. Read state: `canvas_state_read` for the **Project Context** notes doc, and `canvas_roadmap_task_list` for agent-assigned tasks.

**During work:**
- Treat the **Project Context** notes doc and the roadmap as the source of truth for what to build and how.
- Update roadmap item `status` (`todo` → `in_progress` → `done`) as you progress.
- Keep the **Project Context** doc current when the project changes.

## Design Language (redesign — source of truth)

**North star:** elegant, spacious, full of wonder & curiosity — "a look into my mind." Restrained like Cursor's aesthetic. **Never** vibecoded / generic-template. Study the *UX* of https://andrewvu.me/ (flow, pacing) but explicitly reject its visual look.

**Typography**
- **Display / wordmark:** `font-cormorant` (Cormorant, weight 300 light) — high-contrast elegant serif. Used for the hero name and major section headings. This is the site's signature voice; keep it light and let it breathe.
- **Body / UI:** `font-montserrat` (weight 300–400). Clean, quiet. Small labels/eyebrows: uppercase, wide tracking (`tracking-[0.18em]`), `text-white/60`.
- **Legacy:** Tourner (`font-tourner`) and Caviar Dreams (`font-caviar`) are being phased out — do not add new usages.

**Color (on the dark 3D stage)**
- Base background `#121212`. Primary text `white`; secondary `text-white/60–70`.
- Single restrained accent: soft blue (`text-blue-300` / `#a3cbff`) for links & hovers. Avoid the loud purple/magenta gradient borders in new work — they read as the old style.

**Space & rhythm:** generous whitespace, large hero, calm vertical cadence. Prefer air over density.

**Motion:** subtle and slow (200–1500ms, ease-out). Purposeful only — no bouncy/childish effects. Always honor `prefers-reduced-motion` (see `components/Typewriter.tsx` for the pattern).

**Reusable pieces:** `components/Typewriter.tsx` — tasteful typing effect (used for the "Hi, I'm Jaxon" hero entrance). Reuse it rather than reinventing.

## Project quick reference

Personal website + portfolio. **Next.js 16 (Pages Router)** · TypeScript · Tailwind · Prisma + Supabase · Three.js. Deployed on Vercel.

- `pages/` — routes: `index.tsx`, `projects.tsx`, `chess.tsx`, `blog.tsx`, `resume.tsx`, `contact.tsx`; `pages/api/`, `pages/admin/`.
- `components/` — `header.tsx`, `footer.tsx`, `backgroundThree.tsx`, `gradientbg.tsx`, `techStack.tsx`, `myPath.tsx`, `chess/`, `finance/`.
- `lib/`, `prisma/`, `supabase/`, `styles/`, `public/`.

**Commands:** `npm run dev` · `npm run build` (`prisma generate && next build`) · `npm run lint`

**Conventions:** Pages Router (not App Router). Prettier + ESLint configured — match surrounding style. Branch off `main`; confirm before pushing or deploying.
