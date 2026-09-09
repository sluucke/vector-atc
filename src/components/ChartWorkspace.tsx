"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Map as MapIcon,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
} from "lucide-react";
import PdfCanvas from "./PdfCanvas";
import type { AirportGeometry, Chart, Procedure } from "@/lib/types";

const ProcedureMap = dynamic(() => import("./ProcedureMap"), {
  ssr: false,
  loading: () => (
    <div className="dot-grid flex-1 min-h-0 grid place-items-center">
      <p className="font-mono text-xs text-ink-faint">Carregando mapa…</p>
    </div>
  ),
});

const TYPE_ORDER = ["SID", "STAR", "IAC", "ADC", "VAC", "PDC"];
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 6;

export default function ChartWorkspace({
  icao,
  procedure,
  charts,
  geometry,
}: {
  icao: string;
  procedure: Procedure;
  charts: Chart[];
  geometry: AirportGeometry | null;
}) {
  // Deep links from the traffic panel open straight into the map on a flight.
  const params = useSearchParams();
  const focus = params.get("focus");
  const [view, setView] = useState<"chart" | "map">(
    params.get("view") === "map" ? "map" : "chart"
  );
  const [chartKey, setChartKey] = useState(procedure.chartKey);
  const [zoom, setZoom] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const chart = charts.find((c) => c.key === chartKey) ?? charts[0];
  const isProcedureChart = chartKey === procedure.chartKey;

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: charts.filter((c) => c.type === type),
  })).filter((g) => g.items.length > 0);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen();
  }

  function step(factor: number) {
    setZoom((z) =>
      Number(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)).toFixed(3))
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col min-w-0 bg-content"
    >
      <div className="h-11 shrink-0 flex items-center gap-2 px-3 border-b border-line bg-panel">
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-black/30 shrink-0">
          {(
            [
              ["chart", "CARTA", FileText],
              ["map", "MAPA", MapIcon],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] font-medium transition-colors duration-150 ${
                view === id
                  ? "bg-signal/15 text-signal"
                  : "text-ink-faint hover:text-ink-dim"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {view === "chart" && (
          <div className="relative min-w-0">
            <button
              onClick={() => setPickerOpen((o) => !o)}
              className="flex items-center gap-2 max-w-md px-2.5 py-1.5 rounded-lg border border-line hover:border-line-strong transition-colors duration-150"
            >
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-ink-dim shrink-0">
                {chart.type}
              </span>
              <span className="font-mono text-[11px] text-ink truncate">
                {chart.name}
              </span>
              {!isProcedureChart && (
                <span className="font-mono text-[9px] text-warn shrink-0">
                  outra carta
                </span>
              )}
              <ChevronDown className="size-3.5 text-ink-faint shrink-0" />
            </button>

            {pickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setPickerOpen(false)}
                />
                <div className="absolute left-0 top-full mt-1 z-30 w-96 max-h-[70vh] overflow-y-auto rounded-lg bg-raised border border-line-strong shadow-2xl py-1.5">
                  {grouped.map((group) => (
                    <div key={group.type}>
                      <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                        {group.type}
                      </p>
                      {group.items.map((item) => (
                        <button
                          key={item.key}
                          onClick={() => {
                            setChartKey(item.key);
                            setZoom(1);
                            setPickerOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors duration-150 ${
                            item.key === chartKey
                              ? "bg-signal/11 text-signal"
                              : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <span className="font-mono text-[11px] truncate flex-1">
                            {item.name}
                          </span>
                          {item.key === procedure.chartKey && (
                            <span className="font-mono text-[9px] text-ink-faint shrink-0">
                              deste proc.
                            </span>
                          )}
                          <span className="font-mono text-[9px] text-ink-faint shrink-0">
                            {item.amdt}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {view === "map" && (
          <p className="font-mono text-[11px] text-ink-dim truncate">
            {procedure.type} {procedure.name} · RWY {procedure.runway} ·{" "}
            <span className="text-ink-faint">geometria da coding table</span>
          </p>
        )}

        <div className="ml-auto flex items-center gap-1 shrink-0">
          {view === "chart" && (
            <>
              <button
                onClick={() => step(1 / 1.25)}
                aria-label="Reduzir zoom"
                className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-white/[0.06] hover:text-ink transition-colors duration-150"
              >
                <Minus className="size-4" />
              </button>
              <span className="font-mono text-xs text-ink-dim w-12 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => step(1.25)}
                aria-label="Aumentar zoom"
                className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-white/[0.06] hover:text-ink transition-colors duration-150"
              >
                <Plus className="size-4" />
              </button>
              <button
                onClick={() => setZoom(1)}
                aria-label="Ajustar à tela"
                title="Ajustar à tela"
                className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-white/[0.06] hover:text-ink transition-colors duration-150"
              >
                <RotateCcw className="size-3.5" />
              </button>
            </>
          )}

          <button
            onClick={toggleFullscreen}
            aria-label="Tela cheia"
            className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-white/[0.06] hover:text-ink transition-colors duration-150"
          >
            <Maximize2 className="size-3.5" />
          </button>
          <a
            href={chart.file}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-ink-dim hover:bg-white/[0.06] hover:text-ink transition-colors duration-150"
          >
            <ExternalLink className="size-3.5" />
            PDF
          </a>
        </div>
      </div>

      {view === "chart" ? (
        <PdfCanvas
          key={chart.file}
          src={chart.file}
          zoom={zoom}
          onZoomChange={setZoom}
        />
      ) : geometry ? (
        <ProcedureMap
          icao={icao}
          procedure={procedure}
          geometry={geometry}
          focusCallsign={focus}
        />
      ) : (
        <div className="dot-grid flex-1 min-h-0 grid place-items-center">
          <p className="font-mono text-xs text-ink-faint">
            Sem geometria publicada para este aeródromo.
          </p>
        </div>
      )}

      <div className="h-7 shrink-0 flex items-center gap-3 px-3 border-t border-line bg-panel">
        <span className="font-mono text-[10px] text-ink-faint truncate">
          {view === "chart"
            ? `${chart.type} · ${chart.name} · AIRAC ${chart.amdt} · ${chart.date}`
            : `Fixos e pernas conforme coding table DECEA · ${geometry?.syncedAt ?? ""}`}
        </span>
        <span className="ml-auto font-mono text-[10px] text-ink-faint shrink-0 hidden sm:block">
          {view === "chart"
            ? "arraste para mover · scroll para zoom"
            : "arraste para mover · scroll para zoom"}
        </span>
      </div>
    </div>
  );
}
