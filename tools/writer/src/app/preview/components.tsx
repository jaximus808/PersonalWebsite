// Preview versions of the site's MDX components (components/content/*):
// same frames, captions, spacing and behaviour, styled by prose.css instead
// of Tailwind. Paths in the exported MDX are site paths, so every src goes
// through the preview's resolver to reach the draft folder or public/.

import { Children, isValidElement, useState, type ComponentProps, type ReactNode } from "react";

import { SITE_COMPONENTS } from "../../mdx/siteComponents";
import type { Fit, FigureRequest, Ratio } from "../../shared/types";
import { useFigureFrame } from "../../shared/useFigureFrame";
import { usePrefersReducedMotion } from "../hooks";
import { figureIdFromSrc, youtubeThumbnail } from "../paths";
import { Icon } from "../ui/Icon";
import { Caption, Frame, FramedImage } from "./Media";

export type PreviewContext = {
  /** Exported (site) path -> URL this browser can load. */
  resolve(src: string): string;
  figures: FigureRequest[];
  slug: string;
};

// ---------------------------------------------------------------------------

export function PreviewFigure({
  src,
  alt,
  caption,
  ratio,
  fit,
  resolve,
}: {
  src: string;
  alt?: string;
  caption?: ReactNode;
  ratio?: Ratio;
  fit?: Fit;
  resolve(src: string): string;
}) {
  return (
    <figure className="media">
      <FramedImage
        src={resolve(src ?? "")}
        alt={alt ?? (typeof caption === "string" ? caption : "")}
        ratio={ratio}
        fit={fit}
      />
      {caption ? <Caption>{caption}</Caption> : null}
    </figure>
  );
}

type GalleryImage = string | { src: string; alt?: string };

export function PreviewGallery({
  images,
  caption,
  columns = 2,
  ratio = "square",
  fit = "cover",
  resolve,
}: {
  images: GalleryImage[];
  caption?: ReactNode;
  columns?: 2 | 3;
  ratio?: Ratio;
  fit?: Fit;
  resolve(src: string): string;
}) {
  const list = Array.isArray(images) ? images : [];
  return (
    <figure className="media">
      <div className={`gallery gallery--${columns === 3 ? 3 : 2}`}>
        {list.map((image, index) => {
          const { src, alt } = typeof image === "string" ? { src: image, alt: "" } : image;
          return <FramedImage key={`${src}-${index}`} src={resolve(src)} alt={alt} ratio={ratio} fit={fit} />;
        })}
      </div>
      {caption ? <Caption>{caption}</Caption> : null}
    </figure>
  );
}

export function PreviewVideo({
  youtube,
  src,
  poster,
  loop = false,
  caption,
  title = "Video",
  resolve,
}: {
  youtube?: string;
  src?: string;
  poster?: string;
  loop?: boolean;
  caption?: ReactNode;
  title?: string;
  resolve(src: string): string;
}) {
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);

  let body: ReactNode = <span className="frame__missing">No video yet</span>;
  if (youtube) {
    const still = poster ? resolve(poster) : youtubeThumbnail(youtube);
    body = playing ? (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtube)}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="frame__fill-media"
      />
    ) : (
      <button type="button" className="video-still" onClick={() => setPlaying(true)} aria-label={`Play ${title}`}>
        <img src={still} alt="" loading="lazy" decoding="async" />
        <span className="video-still__play">
          <Icon name="play" size={22} />
        </span>
      </button>
    );
  } else if (src) {
    const ambient = loop && !reduced;
    body = (
      <video
        key={ambient ? "ambient" : "manual"}
        src={resolve(src)}
        poster={poster ? resolve(poster) : undefined}
        title={title}
        className="frame__fill-media frame__fill-media--cover"
        playsInline
        preload="metadata"
        {...(ambient ? { autoPlay: true, muted: true, loop: true } : { controls: true, loop })}
      />
    );
  }

  return (
    <figure className="media">
      <Frame ratio="wide">{body}</Frame>
      {caption ? <Caption>{caption}</Caption> : null}
    </figure>
  );
}

export function PreviewDivider({ label }: { label?: string }) {
  if (!label) return <hr className="divider" />;
  return (
    <div role="separator" aria-label={label} className="divider-label">
      <span aria-hidden="true" />
      <span className="divider-label__text">{label}</span>
      <span aria-hidden="true" />
    </div>
  );
}

export function PreviewPullQuote({ children, cite }: { children: ReactNode; cite?: string }) {
  return (
    <figure className="pull-quote">
      <div className="pull-quote__text">{children}</div>
      {cite ? <figcaption className="pull-quote__cite">{cite}</figcaption> : null}
    </figure>
  );
}

export function PreviewCallout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="callout">
      {title ? <p className="callout__title">{title}</p> : null}
      {children}
    </aside>
  );
}

/**
 * An Anatomy figure: the built page in an iframe that grows to its content
 * (same origin, so the document's height is readable), or a quiet
 * placeholder until Claude builds it.
 */
export function PreviewDiagram({
  src,
  title,
  caption,
  size,
  ctx,
}: {
  src: string;
  title?: string;
  caption?: ReactNode;
  size?: "hero" | "figure";
  ctx: PreviewContext;
}) {
  const id = figureIdFromSrc(src ?? "");
  const built = id ? ctx.figures.some((figure) => figure.id === id && figure.built) : false;
  const frame = useFigureFrame(src ?? "");

  return (
    <figure className={`media diagram${size === "hero" ? " diagram--hero" : ""}`}>
      {built ? (
        <iframe
          ref={frame.ref}
          src={ctx.resolve(src)}
          title={title || "Figure"}
          loading="lazy"
          className="diagram__frame"
          style={frame.height ? { height: frame.height } : { aspectRatio: "16 / 10" }}
          onLoad={frame.onLoad}
        />
      ) : (
        <div className="diagram__pending">
          <Icon name="sparkle" size={18} />
          <p className="diagram__pending-title">{title || id || "Figure"}</p>
          <p className="diagram__pending-hint">
            Not built yet. Ask Claude: <span className="mono">build the figures for {ctx.slug}</span>
          </p>
        </div>
      )}
      {caption ? <Caption>{caption}</Caption> : null}
    </figure>
  );
}

/**
 * A component the preview can't run. Either the site has it (a one-off embed
 * like TandemBoardDemo) and it just renders there, or the site doesn't, and
 * the build would fail on it (Checks says the same).
 */
function UnpreviewedEmbed({ name }: { name: string }) {
  const onSite = SITE_COMPONENTS.includes(name);
  return (
    <div className={`embed-placeholder${onSite ? "" : " embed-placeholder--unknown"}`} role={onSite ? undefined : "note"}>
      <span className="mono">&lt;{name} /&gt;</span>
      <span>{onSite ? "Renders on the site only." : "Not a site component. The build stops on this; check the name."}</span>
    </div>
  );
}

function codeLanguage(children: ReactNode): string | null {
  const child = Children.toArray(children)[0];
  if (!isValidElement(child)) return null;
  const className = (child.props as { className?: string }).className ?? "";
  const match = /language-([\w+#.-]+)/.exec(className);
  return match ? match[1] : null;
}

function isExternal(href?: string): boolean {
  return !!href && /^(https?:)?\/\//i.test(href);
}

/** The component map handed to the evaluated MDX. */
export function previewComponents(ctx: PreviewContext, unknownNames: string[]) {
  const resolve = ctx.resolve;
  const map: Record<string, unknown> = {
    Figure: (props: Omit<ComponentProps<typeof PreviewFigure>, "resolve">) => (
      <PreviewFigure {...props} resolve={resolve} />
    ),
    Gallery: (props: Omit<ComponentProps<typeof PreviewGallery>, "resolve">) => (
      <PreviewGallery {...props} resolve={resolve} />
    ),
    Video: (props: Omit<ComponentProps<typeof PreviewVideo>, "resolve">) => (
      <PreviewVideo {...props} resolve={resolve} />
    ),
    Divider: PreviewDivider,
    PullQuote: PreviewPullQuote,
    Callout: PreviewCallout,
    Diagram: (props: Omit<ComponentProps<typeof PreviewDiagram>, "ctx">) => <PreviewDiagram {...props} ctx={ctx} />,

    a({ href, children, ...rest }: ComponentProps<"a">) {
      return (
        <a
          {...rest}
          href={href}
          // Everything opens in a new tab: leaving the writer by accident is worse.
          target="_blank"
          rel="noopener noreferrer"
          data-external={isExternal(href) || undefined}
        >
          {children}
        </a>
      );
    },
    img({ src, alt }: ComponentProps<"img">) {
      return typeof src === "string" ? (
        <PreviewFigure src={src} caption={alt || undefined} alt={alt} resolve={resolve} />
      ) : null;
    },
    hr() {
      return <PreviewDivider />;
    },
    pre({ children, ...rest }: ComponentProps<"pre">) {
      const language = codeLanguage(children);
      return (
        <div className="code-block">
          {language ? <span className="code-block__label">{language}</span> : null}
          <pre {...rest}>{children}</pre>
        </div>
      );
    },
    table({ children, ...rest }: ComponentProps<"table">) {
      return (
        <div className="table-wrap">
          <table {...rest}>{children}</table>
        </div>
      );
    },
  };
  for (const name of unknownNames) {
    if (!(name in map)) map[name] = () => <UnpreviewedEmbed name={name} />;
  }
  return map;
}
