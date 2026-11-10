"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PlaneTakeoff,
  PlaneLanding,
  PlaneLanding as ApproachIcon,
  Building2,
  Eye,
  ParkingSquare,
  FileText,
  Wand2,
  Route,
} from "lucide-react";
import { useIvaoSession } from "@/providers/IvaoSessionProvider";
import { useAirportContext } from "@/providers/AirportContextProvider";
import RunwayFilterToggle from "@/components/airport/RunwayFilterToggle";
import { usePaneClass } from "@/components/layout/MobilePanes";
import { servesRunway } from "@/lib/ops/runway-match";
import { CATEGORY_LABELS } from "@/lib/charts/relevance";
import { categoryEntries } from "@/lib/charts/inventory";
import type { Chart, Procedure } from "@/lib/types";

const CATEGORY_ORDER = ["SID", "STAR", "IAC", "ADC", "VAC", "REA", "PDC", "AOC"];

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  SID: PlaneTakeoff,
  STAR: PlaneLanding,
  IAC: ApproachIcon,
  ADC: Building2,
  VAC: Eye,
  REA: Route,
  PDC: ParkingSquare,
};

const CATEGORY_TINT: Record<string, string> = {
  SID: "text-signal",
  STAR: "text-warn",
  IAC: "text-ok",
};


export default function ProcedureBrowser({
  icao,
  procedures,
  charts,
}: {
  icao: string;
  procedures: Procedure[];
  charts: Chart[];
}) {
  const pathname = usePathname();
  const session = useIvaoSession();
  const {
    runways: activeRunways,
    onlyActiveRunway,
    categories: active,
    categoriesAuto: isAuto,
    toggleCategory,
    resetCategories,
  } = useAirportContext();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const paneClass = usePaneClass("browser");

  const available = useMemo(
    () =>
      CATEGORY_ORDER.filter((c) => charts.some((chart) => chart.type === c)),
    [charts]
  );

  const sections = useMemo(
    () =>
      CATEGORY_ORDER.filter(
        (c) => available.includes(c) && active.includes(c)
      ).map((category) => ({
        category,
        entries: categoryEntries(icao, charts, procedures, category).filter(
          (entry) =>
            !onlyActiveRunway ||
            !entry.group ||
            servesRunway(entry.group.replace(/^RWY /, ""), activeRunways)
        ),
      })),
    [
      available,
      active,
      procedures,
      charts,
      icao,
      onlyActiveRunway,
      activeRunways,
    ]
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return (
    <div
      className={`w-full md:w-[21rem] shrink-0 flex-col bg-panel border-r border-line ${paneClass}`}
    >
      <div className="shrink-0 p-3 border-b border-line space-y-2">
        <div className="flex flex-wrap gap-1">
          {available.map((category) => {
            const on = active.includes(category);
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                title={CATEGORY_LABELS[category] ?? category}
                className={`px-2 py-1 rounded-md font-mono text-[10px] font-medium transition-colors duration-150 ${
                  on
                    ? "bg-signal/15 text-signal"
                    : "bg-inset text-ink-faint hover:text-ink-dim"
                }`}
              >
                {category}
                <span className="ml-1 opacity-60">
                  {categoryEntries(icao, charts, procedures, category).length}
                </span>
              </button>
            );
          })}
        </div>

        <RunwayFilterToggle />

        {isAuto && (
          <div className="flex items-center gap-1.5 text-[10px] text-ink-faint">
            <Wand2 className="size-3 text-signal shrink-0" />
            <span className="font-mono">
              filtro sugerido para {session?.controller?.position}
            </span>
            <button
              onClick={() => {
                for (const category of available) {
                  if (!active.includes(category)) toggleCategory(category);
                }
              }}
              className="ml-auto cursor-pointer font-mono text-ink-faint hover:text-ink-dim underline"
            >
              ver todas
            </button>
          </div>
        )}

        {!isAuto && session?.controller?.position && (
          <button
            onClick={resetCategories}
            className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono text-ink-faint hover:text-ink-dim"
          >
            <Wand2 className="size-3" />
            voltar ao filtro de {session?.controller?.position}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sections.map(({ category, entries }) => {
          const Icon = CATEGORY_ICONS[category] ?? FileText;
          // The runway in use comes first — it's what the controller is working.
          const groups = Array.from(new Set(entries.map((e) => e.group))).sort(
            (a, b) => {
              const rank = (g: string | null) =>
                g && servesRunway(g.replace(/^RWY /, ""), activeRunways) ? 0 : 1;
              return rank(a) - rank(b) || (a ?? "").localeCompare(b ?? "");
            }
          );

          return (
            <div key={category} className="mb-3">
              <p className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                <Icon
                  className={`size-3 ${CATEGORY_TINT[category] ?? "text-ink-faint"}`}
                />
                {category}
                <span className="normal-case tracking-normal opacity-70">
                  {CATEGORY_LABELS[category] ?? ""}
                </span>
              </p>

              {groups.map((group) => (
                <div key={group ?? "all"}>
                  {group && (
                    <p className="px-2 py-1 flex items-center gap-1.5 font-mono text-[9px] text-ink-faint">
                      {group}
                      {group && servesRunway(group.replace(/^RWY /, ""), activeRunways) && (
                        <span className="px-1 rounded bg-ok/12 text-ok">
                          em uso
                        </span>
                      )}
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {entries
                      .filter((e) => e.group === group)
                      .map((entry) => {
                        const on = pathname === entry.href;
                        return (
                          <Link
                            key={entry.key}
                            href={entry.href}
                            ref={on ? activeRef : undefined}
                            className={`block px-2.5 py-2 rounded-lg border-l-2 transition-colors duration-150 ${
                              on
                                ? "border-signal bg-signal/11"
                                : "border-transparent hover:bg-hover"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-[13px] font-medium truncate ${
                                  on ? "text-signal" : "text-ink"
                                }`}
                              >
                                {entry.label}
                              </span>
                              {entry.badge && (
                                <span
                                  className={`ml-auto shrink-0 font-mono text-[9px] px-1.5 py-0.5 rounded ${
                                    entry.badge === "RNAV"
                                      ? "bg-ok/12 text-ok"
                                      : "bg-warn/12 text-warn"
                                  }`}
                                >
                                  {entry.badge}
                                </span>
                              )}
                            </div>
                            {entry.sublabel && (
                              <p className="mt-1 font-mono text-[10px] text-ink-faint truncate">
                                {entry.sublabel}
                              </p>
                            )}
                          </Link>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {sections.every((s) => s.entries.length === 0) && (
          <p className="px-3 py-8 text-center text-xs text-ink-faint">
            Nenhuma carta nas categorias selecionadas.
          </p>
        )}
      </div>
    </div>
  );
}
