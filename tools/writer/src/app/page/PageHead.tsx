// The top of the page in Write mode, laid out like the published page: the
// eyebrow (date, reading time), the big Cormorant title, and for projects the
// summary, links and hero. Title and summary are edited right here.

import { useLayoutEffect, useRef, type KeyboardEvent, type TextareaHTMLAttributes } from "react";

import type { DraftMeta } from "../../shared/types";
import { formatDate, formatMonthYear, readingMinutes } from "../format";
import { youtubeThumbnail } from "../paths";
import { Icon } from "../ui/Icon";
import { FramedImage, Frame } from "../preview/Media";

/** A textarea that grows with its text, so a long title wraps like the page. */
export function AutoGrow(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [props.value]);
  useLayoutEffect(() => {
    // Fonts arriving late (Cormorant) change the wrap; measure again on resize.
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight}px`;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <textarea ref={ref} rows={1} {...props} />;
}

type Props = {
  meta: DraftMeta;
  words: number;
  resolveSrc(src: string): string;
  onChange(patch: Partial<DraftMeta>): void;
  /** Move the caret into the body (Enter or ↓ at the end of the title). */
  onEnterBody(): void;
  onPickCover(): void;
  onOpenDetails(): void;
};

function leaveOnEnter(onEnterBody: () => void) {
  return (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const element = event.currentTarget;
    const atEnd = element.selectionStart === element.value.length && element.selectionEnd === element.value.length;
    if ((event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) || (event.key === "ArrowDown" && atEnd)) {
      event.preventDefault();
      onEnterBody();
    }
  };
}

function CoverSlot({
  meta,
  resolveSrc,
  onPickCover,
  onChange,
}: Pick<Props, "meta" | "resolveSrc" | "onPickCover" | "onChange">) {
  const isProject = meta.kind === "projects";
  const hidden = isProject && meta.hideCover;
  const youtube = isProject ? meta.youtube : undefined;

  if (!meta.cover && !youtube) {
    return (
      <button type="button" className="cover-add" onClick={onPickCover}>
        <Icon name="image" size={14} />
        Add a cover
        <span className="cover-add__hint">{isProject ? "card thumbnail and page hero, 16:9 if you can" : "shown at the top and as the thumbnail"}</span>
      </button>
    );
  }

  return (
    <div className={`cover-slot${hidden ? " is-hidden" : ""}`}>
      {youtube ? (
        <Frame ratio="wide">
          <img className="frame__img frame__img--cover" src={meta.cover ? resolveSrc(meta.cover) : youtubeThumbnail(youtube)} alt="" />
          <span className="video-still__play" aria-hidden="true">
            <Icon name="play" size={22} />
          </span>
        </Frame>
      ) : (
        <FramedImage src={resolveSrc(meta.cover!)} ratio={isProject ? "wide" : "standard"} />
      )}
      <div className="cover-slot__bar">
        {youtube ? <span className="cover-slot__note">YouTube hero{meta.cover ? ", cover as poster" : ""}</span> : null}
        {hidden ? <span className="cover-slot__note">Hidden on the page (hideCover)</span> : null}
        <button type="button" className="chip" onClick={onPickCover}>
          {meta.cover ? "Change cover" : "Add poster"}
        </button>
        {meta.cover ? (
          <button type="button" className="chip" onClick={() => onChange({ cover: undefined })}>
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PageHead({ meta, words, resolveSrc, onChange, onEnterBody, onPickCover, onOpenDetails }: Props) {
  const isProject = meta.kind === "projects";
  const links = (meta.links ?? []).filter((link) => link.label.trim());

  return (
    <div className={`page-head page-head--${meta.kind}`}>
      <p className="page-eyebrow">
        {isProject ? (
          <>
            <span>Project</span>
            <span aria-hidden="true">·</span>
            <button type="button" className="page-eyebrow__edit" onClick={onOpenDetails} title="Change the date">
              {formatMonthYear(meta.date)}
            </button>
            {meta.featured ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="page-eyebrow__accent">Featured</span>
              </>
            ) : null}
          </>
        ) : (
          <>
            <button type="button" className="page-eyebrow__edit" onClick={onOpenDetails} title="Change the date">
              {formatDate(meta.date)}
            </button>
            <span aria-hidden="true">·</span>
            <span>{readingMinutes(words)} min read</span>
          </>
        )}
      </p>

      <AutoGrow
        className={`page-title page-title--${meta.kind} title-input`}
        value={meta.title}
        onChange={(event) => onChange({ title: event.target.value.replace(/\n/g, " ") })}
        onKeyDown={leaveOnEnter(onEnterBody)}
        placeholder="Title"
        aria-label="Title"
        spellCheck
      />

      {isProject ? (
        <AutoGrow
          className="page-summary summary-input"
          value={meta.summary ?? ""}
          onChange={(event) => onChange({ summary: event.target.value.replace(/\n/g, " ") })}
          onKeyDown={leaveOnEnter(onEnterBody)}
          placeholder="One or two sentences. Shown under the title and on the cards."
          aria-label="Summary"
          spellCheck
        />
      ) : null}

      {isProject && links.length > 0 ? (
        <ul className="page-links">
          {links.map((link, index) => (
            <li key={`${link.label}-${index}`}>
              <button type="button" onClick={onOpenDetails} title={link.href || "No URL yet"}>
                {link.label}
                <Icon name="arrowUpRight" size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <CoverSlot meta={meta} resolveSrc={resolveSrc} onPickCover={onPickCover} onChange={onChange} />
    </div>
  );
}
