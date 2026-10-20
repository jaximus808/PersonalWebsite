// Page wrapper for an Anatomy figure that a post or project embeds with
// <Diagram>. It is the anatomy kit's own pageHtml, dark theme, plus a few
// rules that suit a frame the width of the article text:
//
// - the page is transparent, so the figure sits on the site's own #121212;
// - no outer margins and no fixed 650px column: the card fills the frame
//   and <Diagram> sizes the frame to the page's height;
// - a 1px gutter so the card's hairline ring isn't clipped at the edges.
//
// The caption lives in the MDX (<Diagram caption="…">), under the frame like
// every other figure on the site, so leave `caption` out of plateHtml; legend
// keys still belong on the card.
//
// Usage from tools/writer/drafts/<kind>/<slug>/figures/<id>/build.mjs:
//
//   import * as k from "../../../../../../../.claude/skills/anatomy/kit/iso-kit.mjs";
//   import { kitScript } from "../../../../../../../.claude/skills/anatomy/scripts/inline-kit.mjs";
//   import { figurePage, writeFigure } from "../../../../../../../.claude/skills/write/figure-page.mjs";
//   ...
//   writeFigure(import.meta.url, figurePage({ title, body, script: kitScript() + live }));

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { pageHtml } from "../anatomy/kit/iso-kit.mjs";

export const EMBED_CSS = [
  "html,body{background:transparent}",
  ".iso-page{width:auto;margin:0}",
  ".iso-figure{margin:1px 1px 2px}",
].join("");

/**
 * A standalone dark-theme figure page, ready to embed with <Diagram>.
 * Takes the same `title`, `body` and `script` as the kit's pageHtml.
 */
export function figurePage({ title, body, script = "" }) {
  const html = pageHtml({ title, theme: "dark", body, script });
  // After the kit's styles, so these win.
  return html.replace("</head>", `<style>${EMBED_CSS}</style></head>`);
}

/**
 * Writes the page where the writer looks for it: a build script at
 * figures/<id>/build.mjs writes figures/<id>.html. Returns the path written.
 */
export function writeFigure(buildScriptUrl, html) {
  const here = dirname(fileURLToPath(buildScriptUrl));
  const id = basename(here);
  const out = join(here, "..", `${id}.html`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log("wrote", out);
  return out;
}
