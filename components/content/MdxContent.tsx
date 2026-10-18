import React from "react";
import { MDXRemote, type MDXRemoteSerializeResult } from "next-mdx-remote";

import Figure from "./Figure";
import Gallery from "./Gallery";
import Video from "./Video";
import { Callout, Divider, PullQuote } from "./Accents";
import TandemBoardDemo from "./embeds/TandemBoardDemo";
import styles from "./prose.module.css";

function isExternal(href?: string): boolean {
  return !!href && /^(https?:)?\/\//i.test(href);
}

// Pull "language-xyz" off the <code> inside a <pre> so the block can carry a
// quiet language label.
function codeLanguage(children: React.ReactNode): string | null {
  const child = React.Children.toArray(children)[0];
  if (!React.isValidElement(child)) return null;
  const className = (child.props as { className?: string }).className ?? "";
  const match = /language-([\w+#.-]+)/.exec(className);
  return match ? match[1] : null;
}

// Everything an .mdx file can use without importing it. New shared pieces go
// in this map (and in content/README.md).
const components = {
  Figure,
  Gallery,
  Video,
  Divider,
  PullQuote,
  Callout,
  TandemBoardDemo,

  a({ href, children, ...rest }: React.ComponentProps<"a">) {
    const external = isExternal(href);
    return (
      <a
        {...rest}
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },

  // Markdown images get the same frame as <Figure>; the alt text doubles as
  // the caption. (Images alone on a line are lifted out of their paragraph
  // when the content is compiled, so this never lands inside a <p>.)
  img({ src, alt }: React.ComponentProps<"img">) {
    return typeof src === "string" ? <Figure src={src} caption={alt || undefined} alt={alt} /> : null;
  },

  hr() {
    return <Divider />;
  },

  pre({ children, ...rest }: React.ComponentProps<"pre">) {
    const language = codeLanguage(children);
    return (
      <div className={styles.codeBlock}>
        {language ? <span className={styles.codeLabel}>{language}</span> : null}
        <pre {...rest}>{children}</pre>
      </div>
    );
  },

  table({ children, ...rest }: React.ComponentProps<"table">) {
    return (
      <div className={styles.tableWrap}>
        <table {...rest}>{children}</table>
      </div>
    );
  },
};

/** Renders a compiled .mdx body with the site's article typography. */
export default function MdxContent({ source }: { source: MDXRemoteSerializeResult }) {
  return (
    <div className={styles.article}>
      <MDXRemote {...source} components={components} />
    </div>
  );
}
