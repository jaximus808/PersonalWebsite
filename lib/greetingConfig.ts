import config from "../config/greeting.json";
import type { GeoInfo } from "../pages/api/geo";

/**
 * Loads and interprets config/greeting.json — the editable settings for the
 * geo-aware hero. All copy and location rules live in the JSON so they can be
 * changed without touching code. Location matching is intentionally lax: it
 * never asserts the exact detected city (IP geo is often wrong), only broad,
 * warm statements.
 */

type RuleMatch = {
  cities?: string[];
  regionCodes?: string[];
  countryCodes?: string[];
  /** Country code that regionCodes are scoped to. Defaults to "US". */
  country?: string;
};
type Rule = { id: string; match: RuleMatch; say: string };
type GreetingConfig = {
  welcome: string[];
  /** Fixed one-line "who I am" statement shown after the welcome. Not random. */
  identity: string;
  rules: Rule[];
  generic: string[];
  invites: string[];
};

const cfg = config as unknown as GreetingConfig;

const eqCI = (a: string | undefined, b: string | undefined): boolean =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

function ruleMatches(m: RuleMatch, g: GeoInfo): boolean {
  if (m.cities && g.city && m.cities.some((c) => eqCI(c, g.city))) return true;
  if (m.regionCodes && g.regionCode) {
    const scope = m.country ?? "US";
    if (g.countryCode === scope && m.regionCodes.includes(g.regionCode))
      return true;
  }
  if (m.countryCodes && g.countryCode && m.countryCodes.includes(g.countryCode))
    return true;
  return false;
}

function fill(template: string, g: GeoInfo, countryName?: string): string {
  return template
    .replace(/\{city\}/g, g.city ?? "")
    .replace(/\{region\}/g, g.regionName ?? g.regionCode ?? "")
    .replace(/\{country\}/g, countryName ?? g.countryCode ?? "");
}

/**
 * The big opener for a visitor. Only a matching rule (a place with a personal
 * story) speaks about location; otherwise a generic, location-free welcome
 * shows, so it reads naturally to anyone regardless of where they are.
 *
 * `avoid` (typically the chosen invite line) lets the generic pick steer clear
 * of repeating a distinctive word with the line shown beneath it.
 */
export function placeForGeo(
  g: GeoInfo,
  countryName?: string,
  avoid?: string
): string {
  const rule = cfg.rules.find((r) => ruleMatches(r.match, g));
  if (rule) return fill(rule.say, g, countryName);
  return fill(pickAvoiding(cfg.generic, avoid), g, countryName);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Words too common to count as a "clash" between two lines.
const STOP = new Set([
  "this",
  "that",
  "here",
  "there",
  "your",
  "youre",
  "have",
  "what",
  "been",
  "with",
  "from",
  "about",
  "some",
  "just",
  "make",
  "stay",
  "come",
  "look",
  "take",
  "yourself",
  "welcome",
  "glad",
  "happy",
]);

function keywords(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP.has(w))
  );
}

function clashes(a: string, b: string): boolean {
  const wb = keywords(b);
  return Array.from(keywords(a)).some((w) => wb.has(w));
}

/** Pick from `arr`, preferring options that don't share a keyword with `avoid`. */
function pickAvoiding(arr: string[], avoid?: string): string {
  if (avoid) {
    const clear = arr.filter((o) => !clashes(o, avoid));
    if (clear.length) return pick(clear);
  }
  return pick(arr);
}

export const randomWelcome = (): string => pick(cfg.welcome);
export const randomInvite = (): string => pick(cfg.invites);

/** The fixed "who I am" line. Consistent every visit — not random. */
export const identityLine = (): string => cfg.identity;
