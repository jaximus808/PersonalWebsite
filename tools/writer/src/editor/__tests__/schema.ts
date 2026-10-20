// Test helper: the editor's real schema, built from the same extension list
// the editor uses, with a stand-in environment.

import { getSchema } from "@tiptap/core";
import type { Schema } from "@tiptap/pm/model";

import type { EditorEnv } from "../env";
import { buildExtensions } from "../extensions";

export const testEnv: EditorEnv = {
  kind: "blog",
  slug: "test-post",
  upload: async (file) => ({ src: `assets/${file.name}`, url: `/drafts/blog/test-post/assets/${file.name}` }),
  resolveSrc: (src) => src,
  figures: [],
  notify: () => {},
};

let cached: Schema | null = null;

export function editorSchema(): Schema {
  cached ??= getSchema(buildExtensions(() => testEnv));
  return cached;
}
