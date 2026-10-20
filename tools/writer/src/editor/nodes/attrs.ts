// Attribute specs for the custom nodes. Each attribute round-trips through a
// data-* attribute so copy/paste inside the editor (which goes through HTML)
// and the repair path in doc.ts keep every value.

import type { Attribute } from "@tiptap/core";

type Codec<T> = { parse(raw: string): T; serialize(value: T): string | null };

export const text: Codec<string> = {
  parse: (raw) => raw,
  serialize: (value) => (value ? value : null),
};

export const nullableText: Codec<string | null> = {
  parse: (raw) => (raw ? raw : null),
  serialize: (value) => (value ? value : null),
};

export const bool: Codec<boolean> = {
  parse: (raw) => raw === "true",
  serialize: (value) => (value ? "true" : null),
};

export function json<T>(fallback: T): Codec<T> {
  return {
    parse: (raw) => {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    serialize: (value) => JSON.stringify(value),
  };
}

export function oneOf<T extends string | number | null>(allowed: readonly T[], fallback: T): Codec<T> {
  return {
    parse: (raw) => (allowed.find((value) => String(value) === raw) ?? fallback) as T,
    serialize: (value) => (value === null || value === undefined ? null : String(value)),
  };
}

/** An attribute stored on the node and mirrored to `data-<name>` in HTML. */
export function dataAttr<T>(name: string, fallback: T, codec: Codec<T>): Attribute {
  const htmlName = `data-${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
  return {
    default: fallback,
    parseHTML: (element) => {
      const raw = element.getAttribute(htmlName);
      return raw === null ? fallback : codec.parse(raw);
    },
    renderHTML: (attributes) => {
      const value = codec.serialize(attributes[name] as T);
      return value === null ? {} : { [htmlName]: value };
    },
  };
}
