// Frontmatter in the house style of content/*.mdx:
//
//   ---
//   title: "Tandem"
//   date: 2026-06-12
//   summary: "…"
//   links:
//     - label: "GitHub"
//       href: "https://github.com/…"
//   ---
//
// Strings double-quoted, the date bare, keys in a fixed order, empty fields
// left out, no line folding.

import YAML from "yaml";

import type { DraftMeta, Kind, ProjectLink } from "../shared/types.ts";
import type { DraftMetaWithExtra, MetaExtra } from "./nodes.ts";
import { fromSitePath, toSitePath } from "./paths.ts";

const BLOG_KEYS = ["title", "date", "cover"] as const;
const PROJECT_KEYS = ["title", "date", "summary", "cover", "youtube", "featured", "links", "hideCover"] as const;

export function frontmatterKeys(kind: Kind): readonly string[] {
  return kind === "projects" ? PROJECT_KEYS : BLOG_KEYS;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The frontmatter block, including both `---` lines and a final newline. */
export function frontmatterToYaml(meta: DraftMetaWithExtra): string {
  const ctx = { kind: meta.kind, slug: meta.slug };
  const data: Record<string, unknown> = {};
  const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

  for (const key of frontmatterKeys(meta.kind)) {
    switch (key) {
      case "cover": {
        const cover = str(meta.cover);
        if (cover) data.cover = toSitePath(cover, ctx);
        break;
      }
      case "featured":
      case "hideCover":
        if (meta[key] === true) data[key] = true;
        break;
      case "links": {
        const links = (Array.isArray(meta.links) ? meta.links : [])
          .map((link) => ({ label: str(link?.label), href: str(link?.href) }))
          .filter((link) => link.label || link.href);
        if (links.length) data.links = links;
        break;
      }
      default: {
        const value = str(meta[key as "title" | "date" | "summary" | "youtube"]);
        if (value) data[key] = value;
      }
    }
  }
  for (const [key, value] of Object.entries(meta.extra ?? {})) {
    if (!(key in data) && !frontmatterKeys(meta.kind).includes(key) && value !== undefined) data[key] = value;
  }

  const doc = new YAML.Document(data);
  // A bare YYYY-MM-DD, like every existing file (gray-matter reads it as a
  // date). Anything else stays quoted so a typo can't break the YAML.
  const date = doc.get("date", true);
  if (YAML.isScalar(date) && typeof date.value === "string" && DATE.test(date.value)) date.type = "PLAIN";
  const body = Object.keys(data).length
    ? doc.toString({ defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN", lineWidth: 0, indentSeq: true })
    : "";
  return `---\n${body}---\n`;
}

export interface ParsedFrontmatter {
  meta: Omit<DraftMeta, "kind" | "slug" | "createdAt" | "updatedAt">;
  extra: MetaExtra;
  /** Site paths under /<kind>/<slug>/ that became draft assets. */
  assets: string[];
}

/** YAML text (between the `---` lines) -> the writer's fields plus the rest. */
export function yamlToFrontmatter(yaml: string, ctx: { kind: Kind; slug: string }): ParsedFrontmatter {
  let data: unknown;
  try {
    data = yaml.trim() ? YAML.parse(yaml) : {};
  } catch (err) {
    throw new Error(`The frontmatter isn't valid YAML: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
  }
  if (data === null || data === undefined) data = {};
  if (typeof data !== "object" || Array.isArray(data)) throw new Error("The frontmatter must be a set of key: value fields.");

  const record = data as Record<string, unknown>;
  const known = new Set(frontmatterKeys(ctx.kind));
  const meta: ParsedFrontmatter["meta"] = { title: "", date: "" };
  const extra: MetaExtra = {};
  const assets: string[] = [];
  const asString = (value: unknown) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : value === null || value === undefined ? "" : String(value);

  for (const [key, value] of Object.entries(record)) {
    if (!known.has(key)) {
      extra[key] = value;
      continue;
    }
    switch (key) {
      case "title":
      case "date":
      case "summary":
      case "youtube":
        meta[key] = asString(value).trim();
        break;
      case "cover": {
        const { src, asset } = fromSitePath(asString(value), ctx);
        if (src) meta.cover = src;
        if (asset) assets.push(asset);
        break;
      }
      case "featured":
      case "hideCover":
        meta[key] = value === true;
        break;
      case "links":
        if (Array.isArray(value)) {
          meta.links = value
            .filter((link): link is Record<string, unknown> => !!link && typeof link === "object")
            .map((link): ProjectLink => ({ label: asString(link.label), href: asString(link.href) }));
        } else if (value !== null && value !== undefined) {
          extra[key] = value;
        }
        break;
    }
  }
  return { meta, extra, assets };
}
