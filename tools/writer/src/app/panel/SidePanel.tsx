// The right panel: one tab strip over Details, Outline, Figures, Checks, MDX.

import type { ReactNode } from "react";

import { Icon } from "../ui/Icon";

export type PanelTab = "details" | "outline" | "figures" | "checks" | "mdx";

export const PANEL_TABS: { id: PanelTab; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "outline", label: "Outline" },
  { id: "figures", label: "Figures" },
  { id: "checks", label: "Checks" },
  { id: "mdx", label: "MDX" },
];

type Props = {
  tab: PanelTab;
  onTab(tab: PanelTab): void;
  onClose(): void;
  /** Small counts beside a tab label (unbuilt figures, errors). */
  badges: Partial<Record<PanelTab, { count: number; tone: "quiet" | "accent" | "error" }>>;
  children: ReactNode;
};

export function SidePanel({ tab, onTab, onClose, badges, children }: Props) {
  return (
    <aside className="panel" aria-label="Draft details">
      <div className="panel__head">
        <div className="panel__tabs" role="tablist">
          {PANEL_TABS.map(({ id, label }) => {
            const badge = badges[id];
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`panel-tab-${id}`}
                aria-selected={tab === id}
                aria-controls="panel-body"
                className="panel__tab"
                onClick={() => onTab(id)}
              >
                {label}
                {badge && badge.count > 0 ? (
                  <span className={`panel__badge panel__badge--${badge.tone}`}>{badge.count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Hide panel" title="Hide panel (⌘.)">
          <Icon name="close" size={14} />
        </button>
      </div>
      <div className="panel__body" id="panel-body" role="tabpanel" aria-labelledby={`panel-tab-${tab}`}>
        {children}
      </div>
    </aside>
  );
}
