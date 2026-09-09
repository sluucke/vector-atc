"use client";

import Link from "next/link";
import { PlaneTakeoff, PlaneLanding } from "lucide-react";
import { useAirportContext } from "./AirportContextProvider";
import { servesRunway } from "@/lib/runway-match";
import type { Chart, Procedure } from "@/lib/types";

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint border-b border-line ${className}`}
    >
      {children}
    </th>
  );
}

function Fix({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/[0.06] text-ink">
      {children}
    </span>
  );
}

export default function ProcedureTables({
  icao,
  procedures,
  charts,
  type,
}: {
  icao: string;
  procedures: Procedure[];
  charts: Chart[];
  type: Procedure["type"];
}) {
  const { runways: activeRunways } = useAirportContext();

  // Procedures for the runway in use are listed first.
  const rows = procedures
    .filter((p) => p.type === type)
    .sort((a, b) => {
      const rank = (r: string) => (servesRunway(r, activeRunways) ? 0 : 1);
      return (
        rank(a.runway) - rank(b.runway) || a.runway.localeCompare(b.runway)
      );
    });
  // Published charts whose coding table we could not parse have no procedure
  // record, but must stay reachable from the briefing.
  const covered = new Set(rows.map((p) => p.chartKey));
  const orphans = charts.filter((c) => c.type === type && !covered.has(c.key));

  if (rows.length === 0 && orphans.length === 0) return null;

  const isSid = type === "SID";
  const Icon = isSid ? PlaneTakeoff : PlaneLanding;

  return (
    <section id={type.toLowerCase()} className="scroll-mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`size-4 ${isSid ? "text-signal" : "text-warn"}`} />
        <h2 className="text-sm font-semibold tracking-wide">
          {isSid ? "SID · Saídas" : "STAR · Chegadas"}
        </h2>
        <span className="font-mono text-[10px] text-ink-faint">
          {rows.length + orphans.length} cartas
          {orphans.length > 0 && ` · ${rows.length} com geometria`}
        </span>
      </div>

      <div className="rounded-lg border border-line overflow-x-auto bg-panel">
        <table className="w-full min-w-[38rem]">
          <thead>
            <tr>
              <Th>Procedimento</Th>
              <Th>RWY</Th>
              <Th>{isSid ? "Rota comum" : "Fixos de entrada"}</Th>
              <Th>{isSid ? "Transições" : "Rota até o IAF"}</Th>
              <Th className={isSid ? "hidden 2xl:table-cell" : ""}>
                {isSid ? "Notas" : "IAF"}
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className="border-b border-line last:border-0 hover:bg-white/[0.02] transition-colors duration-150"
              >
                <td className="px-3 py-2.5 align-top whitespace-nowrap">
                  <Link
                    href={`/${icao.toLowerCase()}/carta/${p.id}`}
                    className="font-mono text-[13px] font-medium text-signal hover:underline"
                  >
                    {p.name}
                  </Link>
                  <span
                    className={`ml-2 font-mono text-[9px] px-1.5 py-0.5 rounded ${
                      p.category === "RNAV"
                        ? "bg-ok/12 text-ok"
                        : "bg-warn/12 text-warn"
                    }`}
                  >
                    {p.category}
                  </span>
                </td>
                <td className="px-3 py-2.5 align-top font-mono text-xs whitespace-nowrap">
                  <span
                    className={
                      servesRunway(p.runway, activeRunways)
                        ? "px-1.5 py-0.5 rounded bg-ok/12 text-ok font-medium"
                        : "text-ink-dim"
                    }
                  >
                    {p.runway}
                  </span>
                </td>
                <td className="px-3 py-2.5 align-top font-mono text-[11px] text-ink-dim">
                  {isSid
                    ? p.commonRoute
                    : (p.entryFixes ?? []).map((f) => (
                        <span key={f} className="mr-1 inline-block">
                          <Fix>{f}</Fix>
                        </span>
                      ))}
                </td>
                <td className="px-3 py-2.5 align-top">
                  {isSid ? (
                    (p.transitions ?? []).length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {(p.transitions ?? []).map((t) => (
                          <span key={t.fix} title={t.desc}>
                            <Fix>{t.fix}</Fix>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-[11px] text-ink-faint italic">
                        sem fixos nomeados
                      </span>
                    )
                  ) : (
                    <span className="font-mono text-[11px] text-ink-dim">
                      {p.route}
                    </span>
                  )}
                </td>
                <td
                  className={`px-3 py-2.5 align-top ${
                    isSid ? "hidden 2xl:table-cell" : ""
                  }`}
                >
                  {isSid ? (
                    <span
                      className="text-[11px] text-ink-faint leading-snug block max-w-xs line-clamp-3"
                      title={p.notes}
                    >
                      {p.notes}
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] font-medium px-1.5 py-0.5 rounded bg-warn/12 text-warn">
                      {p.iaf}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orphans.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 font-mono text-[10px] text-ink-faint">
            Sem coding table publicada — apenas a carta original:
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {orphans.map((chart) => (
              <Link
                key={chart.key}
                href={`/${icao.toLowerCase()}/chart/${chart.key}`}
                className="rounded-lg border border-line bg-panel p-2.5 hover:border-signal/40 hover:bg-raised transition-colors duration-150"
              >
                <p className="font-mono text-[11px] text-ink">{chart.name}</p>
                <p className="font-mono text-[9px] text-ink-faint">
                  AIRAC {chart.amdt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
