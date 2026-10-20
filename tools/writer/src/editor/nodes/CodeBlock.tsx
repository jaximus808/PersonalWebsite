// codeBlock: fenced code, highlighted with the same lowlight languages the
// site's rehype-highlight uses, in the site's code card with its quiet
// language label. Language "raw-mdx" is special: it holds MDX that goes onto
// the page as typed (an embed like <TandemBoardDemo />, or MDX the importer
// couldn't map to a block), so the card says so. Typing ```mdx makes an
// ordinary "mdx" sample: the input rule only takes letters, so it can never
// produce the passthrough by accident.

import { useState } from "react";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { common, createLowlight } from "lowlight";

import { RAW_MDX_LANGUAGE } from "../../mdx/nodes.ts";
import { IconCheck, IconCopy } from "../icons";
import { cx } from "./ui";

/** Language of a raw MDX passthrough block; the MDX layer owns the value. */
export const RAW_MDX = RAW_MDX_LANGUAGE;

const lowlight = createLowlight(common);
// Raw MDX and MDX samples are mostly components: highlight them as markup.
// ("MDX" is what samples were called before they became plain "mdx".)
lowlight.registerAlias({ xml: [RAW_MDX, "mdx", "MDX"] });

// rehype-highlight on the site doesn't guess a language for unlabelled
// blocks, so neither do we: no language means plain text.
const siteLowlight = {
  highlight: lowlight.highlight,
  listLanguages: lowlight.listLanguages,
  registered: lowlight.registered,
  register: lowlight.register,
  registerAlias: lowlight.registerAlias,
  highlightAuto: (value: string) => lowlight.highlight("plaintext", value),
};

/** The picker's list: what people actually write here, by the name they'd type. */
export const LANGUAGES: { value: string; label: string }[] = [
  { value: "", label: "Plain text" },
  { value: "bash", label: "Bash" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "css", label: "CSS" },
  { value: "diff", label: "Diff" },
  { value: "go", label: "Go" },
  { value: "graphql", label: "GraphQL" },
  { value: "html", label: "HTML" },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
  { value: "json", label: "JSON" },
  { value: "jsx", label: "JSX" },
  { value: "kotlin", label: "Kotlin" },
  { value: "lua", label: "Lua" },
  { value: "makefile", label: "Makefile" },
  { value: "markdown", label: "Markdown" },
  { value: "python", label: "Python" },
  { value: "ruby", label: "Ruby" },
  { value: "rust", label: "Rust" },
  { value: "scss", label: "SCSS" },
  { value: "shell", label: "Shell session" },
  { value: "sql", label: "SQL" },
  { value: "swift", label: "Swift" },
  { value: "toml", label: "TOML" },
  { value: "tsx", label: "TSX" },
  { value: "typescript", label: "TypeScript" },
  { value: "yaml", label: "YAML" },
  { value: "mdx", label: "MDX" },
  { value: RAW_MDX, label: "Raw MDX" },
];

export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({
  lowlight: siteLowlight,
  defaultLanguage: null,
  enableTabIndentation: true,
  tabSize: 2,
  HTMLAttributes: { spellcheck: "false" },
});

function CodeBlockView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const language: string = node.attrs.language ?? "";
  const raw = language === RAW_MDX;
  const [copied, setCopied] = useState(false);
  const known = LANGUAGES.some((option) => option.value === language);
  const options = known ? LANGUAGES : [...LANGUAGES, { value: language, label: language }];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard can be unavailable (permissions); copying by hand still works.
    }
  };

  return (
    <NodeViewWrapper className={cx("wr-code", raw && "is-raw", selected && "is-selected")} data-language={language || undefined}>
      <div className="wr-code__bar" contentEditable={false}>
        {/* The native select stays (keyboard, a11y), invisible over a label
            sized to the current choice rather than the longest option. */}
        <label className="wr-code__lang">
          <span className="wr-code__lang-label" aria-hidden="true">
            {options.find((option) => option.value === language)?.label ?? language}
          </span>
          <select
            value={language}
            onChange={(event) => updateAttributes({ language: event.target.value || null })}
            aria-label="Code language"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {raw ? <span className="wr-code__note">Written to the page as-is</span> : null}
        <button
          type="button"
          className="wr-code__copy"
          onMouseDown={(event) => event.preventDefault()}
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy code"}
        >
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </button>
      </div>
      <pre spellCheck={false}>
        <NodeViewContent<"code"> as="code" className={cx("hljs", language && `language-${language}`)} />
      </pre>
    </NodeViewWrapper>
  );
}
