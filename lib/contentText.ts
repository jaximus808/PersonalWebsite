// Plain-text helpers for MDX/markdown content: excerpts, meta descriptions
// and reading time. Not a parser; good enough for previews.

const WORDS_PER_MINUTE = 220;

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Lightweight markdown -> plain text. Not a parser; good enough for excerpts.
function markdownPlainText(content: string): string {
  return (
    content
      .replace(/\r\n?/g, "\n")
      // fenced code blocks (``` or ~~~), including an unterminated trailing one
      .replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(\n[ \t]*\1[ \t]*(?=\n|$)|$)/gm, " ")
      // html comments, MDX comments and components (props may span lines)
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
      .replace(/<[A-Z][\w.]*(?:\s[^>]*?)?\/>/g, " ")
      .replace(/<([A-Z][\w.]*)[^>]*>[\s\S]*?<\/\1>/g, " ")
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

/** Plain-text version of a post body, whitespace collapsed. */
export function plainText(content: string): string {
  return content ? collapseWhitespace(markdownPlainText(content)) : "";
}

/** Estimated reading time of plain text, in whole minutes (minimum 1). */
export function readingTime(text: string): number {
  const words = text.length === 0 ? 0 : text.split(" ").length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** "2026-03-17" -> "March 17, 2026". Content dates are calendar days, so UTC. */
export function formatDate(ymd: string): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
