// The components a site .mdx file can use without importing them: the keys
// of the `components` map in components/content/MdxContent.tsx. A name the
// site doesn't register compiles fine and then throws "Expected component
// `X` to be defined" while the page prerenders, failing `npm run build`, so
// lint checks raw MDX against this list.
//
// The browser can't read the site's files, so the list lives here too. A test
// (siteComponents.test.ts) reads MdxContent.tsx and fails when the two drift;
// build-draft reads the live map from the repo it builds into.

export const SITE_COMPONENTS: readonly string[] = [
  "Figure",
  "Gallery",
  "Video",
  "Divider",
  "PullQuote",
  "Callout",
  "Diagram",
  "TandemBoardDemo",
];

/**
 * The capitalised keys of `const components = { … }` in MdxContent.tsx's
 * source, or null when the map can't be found (so callers fall back to
 * SITE_COMPONENTS rather than trusting an empty list).
 */
export function componentNamesFromMdxContent(input: string): string[] | null {
  // Comments can hold unbalanced brackets or a capitalised word at a line
  // start; drop them first.
  const source = input.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|\s)\/\/.*$/gm, "$1");
  const start = /\bconst\s+components\s*(?::[^=]+)?=\s*\{/.exec(source);
  if (!start) return null;
  // Walk to the matching brace, keeping only the map's own top level.
  let depth = 1;
  let topLevel = "";
  for (let i = start.index + start[0].length; i < source.length && depth > 0; i++) {
    const char = source[i]!;
    if (char === "{" || char === "(" || char === "[") depth++;
    else if (char === "}" || char === ")" || char === "]") depth--;
    if (depth === 1) topLevel += char;
    else if (depth === 0) break;
    else if (depth === 2 && (char === "{" || char === "(" || char === "[")) topLevel += " ";
  }
  if (depth !== 0) return null;
  const names = new Set<string>();
  // `Figure,` / `Figure: Something,` / `Figure() {…}`: keys start a line.
  for (const match of topLevel.matchAll(/(?:^|[\n,])\s*([A-Z][\w]*)\s*(?=[,:(}\s]|$)/g)) names.add(match[1]!);
  return names.size ? [...names] : null;
}
