"use client";

import { createContext, useContext, useState } from "react";
import { List, LayoutGrid, PanelRight } from "lucide-react";

/**
 * The console shows three columns side by side on a wide screen: the procedure
 * list, the chart or briefing, and the operational panel. A phone has room for
 * one, so below the breakpoints they become tabs and exactly one is on screen.
 */
export type Pane = "browser" | "main" | "side";

const PaneContext = createContext<{
  pane: Pane;
  setPane: (pane: Pane) => void;
} | null>(null);

/** Visibility for one region: its own tab on a phone, its column on a desktop. */
const REGION_CLASS: Record<Pane, Record<Pane, string>> = {
  // The procedure list has a column from md up.
  browser: { browser: "flex", main: "hidden md:flex", side: "hidden md:flex" },
  // The centre keeps its column unless a narrower screen is showing another tab.
  main: { browser: "hidden md:flex", main: "flex", side: "hidden xl:flex" },
  // The operational panel has a column from xl up.
  side: { browser: "hidden xl:flex", main: "hidden xl:flex", side: "flex" },
};

export function MobilePaneProvider({ children }: { children: React.ReactNode }) {
  const [pane, setPane] = useState<Pane>("main");
  return (
    <PaneContext.Provider value={{ pane, setPane }}>
      {children}
    </PaneContext.Provider>
  );
}

/** Visibility classes for the region this component renders. */
export function usePaneClass(region: Pane): string {
  const ctx = useContext(PaneContext);
  return REGION_CLASS[region][ctx?.pane ?? "main"];
}

const TABS: { pane: Pane; label: string; icon: typeof List; hideAt: string }[] = [
  { pane: "browser", label: "Procedimentos", icon: List, hideAt: "md:hidden" },
  { pane: "main", label: "Conteúdo", icon: LayoutGrid, hideAt: "" },
  { pane: "side", label: "Painel", icon: PanelRight, hideAt: "" },
];

/** The switch itself. Only rendered while at least one column is folded away. */
export function PaneTabs() {
  const ctx = useContext(PaneContext);
  if (!ctx) return null;

  return (
    <nav className="shrink-0 xl:hidden flex items-stretch border-t border-line bg-panel">
      {TABS.map(({ pane, label, icon: Icon, hideAt }) => {
        const active = ctx.pane === pane;
        return (
          <button
            key={pane}
            onClick={() => ctx.setPane(pane)}
            aria-current={active ? "page" : undefined}
            className={`flex-1 cursor-pointer flex flex-col items-center justify-center gap-1 py-2 transition-colors duration-150 ${hideAt} ${
              active
                ? "text-signal bg-signal/11"
                : "text-ink-faint hover:text-ink-dim"
            }`}
          >
            <Icon className="size-4" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
