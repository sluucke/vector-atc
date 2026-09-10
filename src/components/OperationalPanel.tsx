"use client";

import { useState } from "react";
import { Radar, TriangleAlert, ScrollText } from "lucide-react";
import TrafficPanel from "./TrafficPanel";
import NotamPanel from "./NotamPanel";
import { usePaneClass } from "./MobilePanes";
import type { Procedure } from "@/lib/types";

export default function OperationalPanel({
  icao,
  procedures,
  notes,
  runwaysNote,
  checkedAt,
}: {
  icao: string;
  procedures: Procedure[];
  notes: string[];
  runwaysNote?: string;
  checkedAt: string;
}) {
  const [tab, setTab] = useState<"traffic" | "notam" | "notes">("traffic");
  const paneClass = usePaneClass("side");

  return (
    <aside
      className={`w-full xl:w-72 shrink-0 flex-col bg-panel border-l border-line ${paneClass}`}
    >
      <div className="shrink-0 h-11 flex items-stretch border-b border-line">
        {(
          [
            ["traffic", "Tráfego", Radar],
            ["notam", "NOTAM", ScrollText],
            ["notes", "Notas", TriangleAlert],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] transition-colors duration-150 ${
              tab === id
                ? "text-signal border-b-2 border-signal"
                : "text-ink-faint hover:text-ink-dim border-b-2 border-transparent"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "traffic" ? (
        <TrafficPanel icao={icao} procedures={procedures} />
      ) : tab === "notam" ? (
        <NotamPanel icao={icao} />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {runwaysNote && (
              <div className="rounded-lg border-l-2 border-warn bg-warn/[0.06] p-3">
                <p className="text-[11px] leading-relaxed text-ink-dim">
                  {runwaysNote}
                </p>
              </div>
            )}
            {notes.map((note, i) => (
              <div
                key={i}
                className="rounded-lg border-l-2 border-signal/50 bg-hover-soft p-3"
              >
                <p className="text-[11px] leading-relaxed text-ink-dim">
                  {note}
                </p>
              </div>
            ))}
          </div>
          <div className="shrink-0 border-t border-line p-3">
            <p className="font-mono text-[10px] text-ink-faint leading-relaxed">
              Dados extraídos das cartas oficiais DECEA/AISWEB.
              <br />
              Verificado em {checkedAt}.
            </p>
          </div>
        </>
      )}
    </aside>
  );
}
