// The "/" menu. Focus stays in the editor while it is open; the suggestion
// plugin forwards arrow keys, Enter and Tab here through the ref.

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { cx } from "../nodes/ui";
import { BLOCK_GROUPS, type BlockGroup, type BlockItem } from "./items";

export interface SlashMenuProps {
  items: BlockItem[];
  query: string;
  loading: boolean;
  command(item: BlockItem): void;
}

export interface SlashMenuHandle {
  onKeyDown(event: KeyboardEvent): boolean;
}

interface Section {
  group: BlockGroup | null;
  items: BlockItem[];
}

export const SlashMenu = forwardRef<SlashMenuHandle, SlashMenuProps>(function SlashMenu(
  { items, query, loading, command },
  ref,
) {
  // Items arrive a tick after each keystroke; keep the last list meanwhile
  // so the menu doesn't flash empty.
  const [shown, setShown] = useState(items);
  useEffect(() => {
    if (!loading) setShown(items);
  }, [items, loading]);

  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [query]);

  const sections: Section[] = useMemo(() => {
    if (query.trim()) return [{ group: null, items: shown }];
    return BLOCK_GROUPS.map((group) => ({ group, items: shown.filter((item) => item.group === group) })).filter(
      (section) => section.items.length > 0,
    );
  }, [shown, query]);
  const flat = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const current = Math.min(active, Math.max(flat.length - 1, 0));

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown(event) {
        if (!flat.length) return false;
        if (event.key === "ArrowDown") {
          setActive((current + 1) % flat.length);
          return true;
        }
        if (event.key === "ArrowUp") {
          setActive((current - 1 + flat.length) % flat.length);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          command(flat[current]);
          return true;
        }
        return false;
      },
    }),
    [flat, current, command],
  );

  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  let index = -1;
  return (
    <div className="wr-popover wr-slash" role="listbox" aria-label="Insert a block" ref={list}>
      {flat.length === 0 ? (
        <div className="wr-slash__empty">{loading ? "…" : <>Nothing called “{query}”</>}</div>
      ) : (
        sections.map((section) => (
          <div key={section.group ?? "results"} className="wr-slash__section" role="group" aria-label={section.group ?? "Results"}>
            {section.group ? <div className="wr-slash__group">{section.group}</div> : null}
            {section.items.map((item) => {
              index += 1;
              const i = index;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  id={`wr-slash-${item.id}`}
                  role="option"
                  aria-selected={i === current}
                  data-index={i}
                  className={cx("wr-slash__item", i === current && "is-active")}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => i !== current && setActive(i)}
                  onClick={() => command(item)}
                >
                  <span className="wr-slash__icon" aria-hidden="true">
                    {item.glyph ? <span className="wr-slash__glyph">{item.glyph}</span> : <Icon size={16} />}
                  </span>
                  <span className="wr-slash__text">
                    <span className="wr-slash__title">{item.title}</span>
                    <span className="wr-slash__hint">{item.hint}</span>
                  </span>
                  {item.markdown ? <kbd className="wr-slash__md">{item.markdown}</kbd> : null}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
});
