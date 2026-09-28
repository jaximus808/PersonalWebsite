import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { ElementContent } from "hast";

import { isMarkdown, parseLegacy } from "../../lib/blogFormat";
import styles from "./BlogContent.module.css";

type BlogContentProps = {
  content: string;
  format?: string | null;
};

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

function Figure({ src, alt }: { src?: string; alt?: string }) {
  return (
    <figure className={styles.figure}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ""} loading="lazy" decoding="async" />
      {alt ? <figcaption>{alt}</figcaption> : null}
    </figure>
  );
}

const markdownComponents: Components = {
  a({ node, href, children, ...rest }) {
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

  // A paragraph holding only an image becomes a real <figure> (a <figure>
  // nested inside <p> is invalid HTML and breaks hydration).
  p({ node, children, ...rest }) {
    const nodeChildren: ElementContent[] = node?.children ?? [];
    const kids = nodeChildren.filter(
      (child) => !(child.type === "text" && child.value.trim() === "")
    );
    if (
      kids.length === 1 &&
      kids[0].type === "element" &&
      kids[0].tagName === "img"
    ) {
      const { src, alt } = kids[0].properties as {
        src?: string;
        alt?: string;
      };
      return <Figure src={src} alt={alt} />;
    }
    return <p {...rest}>{children}</p>;
  },

  // Images mixed into a line of text: phrasing-only markup, same look.
  img({ node, src, alt }) {
    return (
      <span className={styles.figure}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={typeof src === "string" ? src : undefined}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
        />
        {alt ? <span className={styles.caption}>{alt}</span> : null}
      </span>
    );
  },

  pre({ node, children, ...rest }) {
    const language = codeLanguage(children);
    return (
      <div className={styles.codeBlock}>
        {language ? (
          <span className={styles.codeLabel}>{language}</span>
        ) : null}
        <pre {...rest}>{children}</pre>
      </div>
    );
  },

  table({ node, children, ...rest }) {
    return (
      <div className={styles.tableWrap}>
        <table {...rest}>{children}</table>
      </div>
    );
  },
};

const remarkPlugins = [remarkGfm];
const rehypePlugins = [rehypeHighlight];

function LegacyContent({ content }: { content: string }) {
  return (
    <>
      {parseLegacy(content).map((segment, key) => {
        switch (segment.type) {
          case "spacer":
            return <div key={key} className={styles.spacer} />;
          case "image":
            return <Figure key={key} src={segment.src} />;
          case "heading":
            return <h2 key={key}>{segment.text}</h2>;
          default:
            return (
              <p key={key} className={styles.preserve}>
                {segment.text}
              </p>
            );
        }
      })}
    </>
  );
}

export default function BlogContent({ content, format }: BlogContentProps) {
  const body = content ?? "";

  return (
    <div className={styles.article}>
      {isMarkdown(format) ? (
        // Raw HTML is intentionally NOT enabled (no rehype-raw): content comes
        // from the database and must not be able to inject markup or scripts.
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={markdownComponents}
        >
          {body}
        </ReactMarkdown>
      ) : (
        <LegacyContent content={body} />
      )}
    </div>
  );
}
