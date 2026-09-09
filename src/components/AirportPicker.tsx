"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PlaneTakeoff,
  PlaneLanding,
  FileText,
  ArrowRight,
  Search,
} from "lucide-react";

export interface AirportCard {
  icao: string;
  name: string;
  fir: string;
  airacCycle: string;
  airacEffective: string;
  sid: number;
  star: number;
  charts: number;
}

/**
 * The only place an aerodrome is chosen, so it carries its own filter: with a
 * growing list, typing beats scanning.
 */
export default function AirportPicker({
  airports,
}: {
  airports: AirportCard[];
}) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return airports;
    return airports.filter((a) =>
      `${a.icao} ${a.name} ${a.fir}`.toLowerCase().includes(q)
    );
  }, [airports, query]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint shrink-0">
          Aeródromos disponíveis
        </h2>
        <span className="hidden sm:block h-px flex-1 bg-line" />
        <div className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 focus-within:border-signal/50 transition-colors duration-150 sm:w-72">
          <Search className="size-3.5 shrink-0 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ICAO, cidade ou FIR"
            aria-label="Filtrar aeródromos"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink-faint"
          />
          <span className="font-mono text-[10px] text-ink-faint shrink-0">
            {results.length.toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      {results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-5 py-10 text-center text-sm text-ink-faint">
          Nenhum aeródromo para “{query}”.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((a) => (
            <Link
              key={a.icao}
              href={`/${a.icao.toLowerCase()}`}
              className="group cursor-pointer rounded-xl border border-line bg-panel p-5 hover:border-signal/40 hover:bg-raised transition-colors duration-150"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-2xl font-semibold tracking-tight">
                    {a.icao}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-dim truncate">
                    {a.name}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-ink-faint group-hover:text-signal transition-colors duration-150" />
              </div>

              <div className="mt-4 flex items-center gap-4 font-mono text-[11px] text-ink-faint">
                <span className="flex items-center gap-1.5">
                  <PlaneTakeoff className="size-3.5 text-signal" />
                  {a.sid} SID
                </span>
                <span className="flex items-center gap-1.5">
                  <PlaneLanding className="size-3.5 text-warn" />
                  {a.star} STAR
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  {a.charts} cartas
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-line flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-ok" />
                <span className="font-mono text-[10px] text-ink-faint">
                  AIRAC {a.airacCycle} · efetivo {a.airacEffective}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
