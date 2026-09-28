// Shared helpers for the two blog content formats.
//
// - "markdown": standard markdown (GFM), rendered by components/blog/BlogContent.
// - anything else (null / undefined / unknown): the legacy home-grown format,
//   where content is split on "*" and segments are tagged with a "<i>" (image)
//   or "<b>" (heading) prefix.

const WORDS_PER_MINUTE = 220;

export type LegacySegment =
  | { type: "spacer" }
  | { type: "image"; src: string }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string };

export function isMarkdown(format?: string | null): boolean {
  return format === "markdown";
}

// Parse legacy content. Semantics are intentionally identical to the original
// inline renderer: split on "*", then classify each raw (untrimmed) segment.
export function parseLegacy(content: string): LegacySegment[] {
  return (content ?? "").split("*").map((segment): LegacySegment => {
    if (segment.length === 0) return { type: "spacer" };
    if (segment.substring(0, 3) === "<i>") {
      return { type: "image", src: segment.substring(3) };
    }
    if (segment.substring(0, 3) === "<b>") {
      return { type: "heading", text: segment.substring(3) };
    }
    return { type: "paragraph", text: segment };
  });
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function legacyPlainText(content: string): string {
  return content
    .split("*")
    .map((segment) => segment.trim())
    .filter(
      (segment) => segment.length > 0 && segment.substring(0, 3) !== "<i>"
    )
    .map((segment) =>
      segment.substring(0, 3) === "<b>" ? segment.substring(3) : segment
    )
    .join(" ");
}

// Lightweight markdown -> plain text. Not a parser; good enough for excerpts.
function markdownPlainText(content: string): string {
  return (
    content
      .replace(/\r\n?/g, "\n")
      // fenced code blocks (``` or ~~~), including an unterminated trailing one
      .replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(\n[ \t]*\1[ \t]*(?=\n|$)|$)/gm, " ")
      // html comments and tags
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/?[a-zA-Z][^>\n]*>/g, " ")
      // images, then links / reference links -> their text
      .replace(/!\[[^\]]*\]\((?:[^()]|\([^()]*\))*\)/g, " ")
      .replace(/!\[[^\]]*\]\[[^\]]*\]/g, " ")
      .replace(/\[([^\]]*)\]\((?:[^()]|\([^()]*\))*\)/g, "$1")
      .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
      // reference definitions and footnote markers
      .replace(/^[ \t]*\[[^\]]+\]:[^\n]*$/gm, " ")
      .replace(/\[\^[^\]]+\]/g, " ")
      // autolinks <https://...> were removed as tags; bare URLs stay as text
      // table separator rows, horizontal rules, setext underlines
      .replace(/^[ \t]*\|?[ \t]*:?-{2,}:?[ \t]*(\|[ \t]*:?-{2,}:?[ \t]*)*\|?[ \t]*$/gm, " ")
      .replace(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/gm, " ")
      .replace(/^[ \t]*=+[ \t]*$/gm, " ")
      // block prefixes: headings, blockquotes, list bullets, task boxes
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
      .replace(/[ \t]+#+[ \t]*$/gm, "")
      .replace(/^[ \t]*(>[ \t]?)+/gm, "")
      .replace(/^[ \t]*([-*+]|\d+[.)])[ \t]+/gm, "")
      .replace(/^\[[ xX]\][ \t]+/gm, "")
      // inline code keeps its text
      .replace(/`+([^`\n]*)`+/g, "$1")
      // emphasis / strong / strikethrough
      .replace(/(\*\*\*|___)(?=\S)([\s\S]*?\S)\1/g, "$2")
      .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2")
      .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, "$1$2")
      .replace(/(^|[^\w_])_(?=\S)([^_\n]*?\S)_(?!\w)/g, "$1$2")
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "$1")
      // table pipes
      .replace(/\|/g, " ")
      // backslash escapes
      .replace(/\\([\\`*_{}\[\]()#+\-.!|>~])/g, "$1")
  );
}

// Plain-text excerpt source for list pages and meta descriptions.
export function blogPreview(content: string, format?: string | null): string {
  if (!content) return "";
  return collapseWhitespace(
    isMarkdown(format) ? markdownPlainText(content) : legacyPlainText(content)
  );
}

// Estimated reading time in whole minutes (minimum 1).
export function readingTime(content: string, format?: string | null): number {
  const text = blogPreview(content, format);
  const words = text.length === 0 ? 0 : text.split(" ").length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
