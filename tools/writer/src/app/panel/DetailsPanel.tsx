// Details: the frontmatter, per kind. Blog: date and cover. Projects add the
// summary, YouTube hero, featured, links and hideCover.

import { useEffect, useRef, useState } from "react";

import type { DraftMeta, ProjectLink } from "../../shared/types";
import { formatDate, relativeTime } from "../format";
import { sitePath, youtubeId, youtubeThumbnail } from "../paths";
import { FramedImage } from "../preview/Media";
import { Icon } from "../ui/Icon";

type Props = {
  meta: DraftMeta;
  published: boolean;
  resolveSrc(src: string): string;
  onChange(patch: Partial<DraftMeta>): void;
  onPickCover(): void;
};

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange(value: boolean): void;
  label: string;
  hint: string;
}) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle__track" aria-hidden="true">
        <span className="toggle__thumb" />
      </span>
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        <span className="field__hint">{hint}</span>
      </span>
    </label>
  );
}

/** YouTube accepts a pasted URL and keeps just the id. */
function YoutubeField({ value, onChange }: { value: string; onChange(id: string | undefined): void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const id = youtubeId(text);
  const invalid = text.trim().length > 0 && !id;

  return (
    <div className="field">
      <label className="field__label" htmlFor="details-youtube">
        YouTube
      </label>
      <input
        id="details-youtube"
        className="input input--mono"
        value={text}
        placeholder="Paste a link or an id"
        spellCheck={false}
        onChange={(event) => {
          setText(event.target.value);
          const next = youtubeId(event.target.value);
          if (next) onChange(next);
          else if (!event.target.value.trim()) onChange(undefined);
        }}
        onBlur={() => {
          if (id && text !== id) setText(id);
        }}
        aria-invalid={invalid}
      />
      {invalid ? (
        <span className="field__error">That doesn't look like a YouTube link.</span>
      ) : id ? (
        <div className="details-youtube">
          <img src={youtubeThumbnail(id)} alt="" loading="lazy" />
          <span className="field__hint">Replaces the cover as the page hero; the cover stays the poster and thumbnail.</span>
        </div>
      ) : (
        <span className="field__hint">Optional. A video hero for the page.</span>
      )}
    </div>
  );
}

function LinksEditor({ links, onChange }: { links: ProjectLink[]; onChange(links: ProjectLink[]): void }) {
  const update = (index: number, patch: Partial<ProjectLink>) =>
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  // "Add a link" puts the caret in the new row's label, ready to type.
  const list = useRef<HTMLUListElement>(null);
  const focusNew = useRef(false);
  useEffect(() => {
    if (!focusNew.current) return;
    focusNew.current = false;
    list.current?.querySelector<HTMLInputElement>(".links-editor__row:last-child input")?.focus();
  }, [links.length]);

  const move = (index: number, by: -1 | 1) => {
    const next = [...links];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  };

  return (
    <div className="field">
      <span className="field__label">Links</span>
      {links.length === 0 ? <span className="field__hint">GitHub, a live demo, a paper. Shown under the summary.</span> : null}
      <ul className="links-editor" ref={list}>
        {links.map((link, index) => {
          const hrefOk = !link.href.trim() || /^(https?:\/\/|\/|mailto:)/i.test(link.href.trim());
          return (
            <li key={index} className="links-editor__row">
              <div className="links-editor__inputs">
                <input
                  className="input input--small"
                  value={link.label}
                  placeholder="Label"
                  aria-label={`Link ${index + 1} label`}
                  onChange={(event) => update(index, { label: event.target.value })}
                />
                <input
                  className="input input--small input--mono"
                  value={link.href}
                  placeholder="https://…"
                  aria-label={`Link ${index + 1} URL`}
                  spellCheck={false}
                  aria-invalid={!hrefOk}
                  onChange={(event) => update(index, { href: event.target.value })}
                />
                {!hrefOk ? <span className="field__error">Start with https://</span> : null}
              </div>
              <div className="links-editor__tools">
                <button
                  type="button"
                  className="icon-button icon-button--small"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  <Icon name="arrowUp" size={13} />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--small"
                  onClick={() => move(index, 1)}
                  disabled={index === links.length - 1}
                  aria-label="Move down"
                >
                  <Icon name="arrowDown" size={13} />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button--small"
                  onClick={() => onChange(links.filter((_, i) => i !== index))}
                  aria-label="Remove link"
                >
                  <Icon name="close" size={13} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="text-button"
        onClick={() => {
          focusNew.current = true;
          onChange([...links, { label: "", href: "" }]);
        }}
      >
        <Icon name="plus" size={13} />
        Add a link
      </button>
    </div>
  );
}

export function DetailsPanel({ meta, published, resolveSrc, onChange, onPickCover }: Props) {
  const isProject = meta.kind === "projects";
  const ref = { kind: meta.kind, slug: meta.slug };

  return (
    <div className="panel-section details">
      <div className="field">
        <label className="field__label" htmlFor="details-date">
          Date
        </label>
        <input
          id="details-date"
          className="input"
          type="date"
          value={meta.date}
          onChange={(event) => event.target.value && onChange({ date: event.target.value })}
        />
        <span className="field__hint">{formatDate(meta.date)}. Lists sort by this, newest first.</span>
      </div>

      <div className="field">
        <span className="field__label">Cover</span>
        {meta.cover ? (
          <div className="details-cover">
            <FramedImage src={resolveSrc(meta.cover)} ratio={isProject ? "wide" : "standard"} />
            <div className="details-cover__tools">
              <span className="mono details-cover__path" title={meta.cover}>
                {meta.cover}
              </span>
              <button type="button" className="text-button" onClick={onPickCover}>
                Change
              </button>
              <button type="button" className="text-button text-button--quiet" onClick={() => onChange({ cover: undefined })}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="details-cover__empty"
            style={{ aspectRatio: isProject ? "16 / 9" : "3 / 2" }}
            onClick={onPickCover}
          >
            <Icon name="image" size={16} />
            Choose a cover
          </button>
        )}
      </div>

      {isProject ? (
        <>
          <div className="field">
            <label className="field__label" htmlFor="details-summary">
              Summary <span className="field__required">required</span>
            </label>
            <textarea
              id="details-summary"
              className="input textarea"
              rows={3}
              value={meta.summary ?? ""}
              placeholder="One or two sentences. Plain text."
              onChange={(event) => onChange({ summary: event.target.value.replace(/\n/g, " ") })}
            />
            <span className="field__hint">{(meta.summary ?? "").length} characters · shown on the cards too</span>
          </div>

          <YoutubeField value={meta.youtube ?? ""} onChange={(youtube) => onChange({ youtube })} />

          <LinksEditor links={meta.links ?? []} onChange={(links) => onChange({ links })} />

          <Toggle
            checked={!!meta.featured}
            onChange={(featured) => onChange({ featured: featured || undefined })}
            label="Featured"
            hint="Marks it Featured on the projects page."
          />
          <Toggle
            checked={!!meta.hideCover}
            onChange={(hideCover) => onChange({ hideCover: hideCover || undefined })}
            label="Hide the hero"
            hint="For a page whose body leads with its own media."
          />
        </>
      ) : null}

      <dl className="details-facts">
        <div>
          <dt>Page</dt>
          <dd className="mono">{sitePath(ref)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{published ? "On the site; building updates that page." : "Not published yet"}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{relativeTime(meta.createdAt)}</dd>
        </div>
      </dl>
    </div>
  );
}
