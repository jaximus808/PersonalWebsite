// Ranking for the slash menu's filter. Pure, so it is tested on its own.

export interface Searchable {
  title: string;
  keywords: readonly string[];
}

function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (const char of haystack) {
    if (char === needle[i]) i += 1;
    if (i === needle.length) return true;
  }
  return needle.length === 0;
}

/** Higher is better; 0 means no match. */
export function matchScore(item: Searchable, rawQuery: string): number {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return 1;
  const title = item.title.toLowerCase();
  const words = title.split(/[\s-]+/);
  const keywords = item.keywords.map((keyword) => keyword.toLowerCase());

  if (title === query || keywords.includes(query)) return 120;
  if (title.startsWith(query)) return 100;
  if (words.some((word) => word.startsWith(query))) return 80;
  if (keywords.some((keyword) => keyword.startsWith(query))) return 60;
  if (title.includes(query)) return 40;
  if (keywords.some((keyword) => keyword.includes(query))) return 30;
  if (query.length >= 2 && isSubsequence(query, title.replace(/\s+/g, ""))) return 10;
  return 0;
}

/** Items matching the query, best first; ties keep their menu order. */
export function filterItems<T extends Searchable>(items: readonly T[], query: string): T[] {
  return items
    .map((item, index) => ({ item, index, score: matchScore(item, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
