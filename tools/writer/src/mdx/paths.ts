// How media paths move between a draft and the site.
//
//   draft                    site file
//   assets/<file>      <->   /<kind>/<slug>/<file>
//   /blog/..., /projects/... and http(s) URLs are left alone both ways.
//
// Anatomy figures are separate: <Diagram src="/<kind>/<slug>/figures/<id>.html" />.

import type { Kind } from "../shared/types.ts";

export interface PathContext {
  kind: Kind;
  slug: string;
}

const ASSET_PREFIX = "assets/";

/** Doc path -> the path the published page uses. */
export function toSitePath(src: string, ctx: PathContext): string {
  const value = src.trim();
  if (value.startsWith(ASSET_PREFIX)) return `/${ctx.kind}/${ctx.slug}/${value.slice(ASSET_PREFIX.length)}`;
  return value;
}

/**
 * Site path -> doc path. Files under /<kind>/<slug>/ become draft assets (and
 * are reported so the caller can copy them in); anything else is unchanged.
 */
export function fromSitePath(src: string, ctx: PathContext): { src: string; asset: string | null } {
  const value = src.trim();
  const prefix = `/${ctx.kind}/${ctx.slug}/`;
  if (value.startsWith(prefix) && value.length > prefix.length && !value.includes("/../")) {
    return { src: ASSET_PREFIX + value.slice(prefix.length), asset: value };
  }
  return { src: value, asset: null };
}

export function isAssetPath(src: string): boolean {
  return src.trim().startsWith(ASSET_PREFIX);
}

export function isRemote(src: string): boolean {
  return /^(https?:)?\/\//i.test(src.trim());
}

/** Where a built anatomy figure lives on the site. */
export function diagramSrc(id: string, ctx: PathContext): string {
  return `/${ctx.kind}/${ctx.slug}/figures/${id}.html`;
}

/** Inverse of diagramSrc; null when the path isn't this draft's figure. */
export function diagramId(src: string, ctx: PathContext): string | null {
  const prefix = `/${ctx.kind}/${ctx.slug}/figures/`;
  const value = src.trim();
  if (!value.startsWith(prefix) || !value.endsWith(".html")) return null;
  const id = value.slice(prefix.length, -".html".length);
  return isFigureId(id) ? id : null;
}

/** Anatomy ids double as filenames: lowercase letters, digits, single hyphens. */
export function isFigureId(id: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 80;
}
