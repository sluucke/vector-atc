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
  RotateCw,
} from "lucide-react";
import PdfCanvas from "./PdfCanvas";
import BackToAirport from "./BackToAirport";
import Tooltip from "./Tooltip";
import { usePaneClass } from "./MobilePanes";
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
  initialChartKey,
  charts,
  geometry,
}: {
  icao: string;
  /** Null when browsing a chart that is not tied to a procedure (IAC, ADC…). */
  procedure: Procedure | null;
  initialChartKey: string;
  charts: Chart[];
  geometry: AirportGeometry | null;
}) {
  // Deep links from the traffic panel open straight into the map on a flight.
  const params = useSearchParams();
  const focus = params.get("focus");
  const [view, setView] = useState<"chart" | "map">(
    params.get("view") === "map" ? "map" : "chart",
  );
  const [chartKey, setChartKey] = useState(initialChartKey);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const paneClass = usePaneClass("main");

  const chart = charts.find((c) => c.key === chartKey) ?? charts[0];
  const isProcedureChart = chartKey === initialChartKey;

  const hasMap = Boolean(procedure && geometry && procedure.geometryKey);

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
      Number(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)).toFixed(3)),
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex-col min-w-0 bg-content ${paneClass}`}
    >
      {/* Wraps onto a second line on a phone: every control stays reachable
          instead of being clipped off the right edge. */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 gap-y-1 py-1 sm:py-0 sm:h-11 px-3 border-b border-line bg-panel">
        <BackToAirport icao={icao} label="Cartas" />
        <span className="w-px h-4 bg-line shrink-0" />

        <div className="flex gap-0.5 p-0.5 rounded-lg bg-inset shrink-0">
          {(
            [
              ["chart", "CARTA", FileText],
              // Only offered when a coding table gives us something to plot.
              ...(hasMap ? ([["map", "MAPA", MapIcon]] as const) : []),
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
              className="flex items-center gap-2 max-w-full md:max-w-md cursor-pointer px-2.5 py-1.5 rounded-lg border border-line hover:border-line-strong transition-colors duration-150"
            >
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-hover text-ink-dim shrink-0">
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
                <div className="absolute left-0 top-full mt-1 z-30 w-[min(24rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-lg bg-raised border border-line-strong shadow-2xl py-1.5">
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
                            setRotation(0);
                            setPickerOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors duration-150 ${
                            item.key === chartKey
                              ? "bg-signal/11 text-signal"
                              : "hover:bg-hover"
                          }`}
                        >
                          <span className="font-mono text-[11px] truncate flex-1">
                            {item.name}
                          </span>
                          {item.key === initialChartKey && (
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

        {view === "map" && procedure && (
          <p className="font-mono text-[11px] text-ink-dim truncate">
            {procedure.type} {procedure.name} · RWY {procedure.runway} ·{" "}
            <span className="text-ink-faint">rota publicada</span>
          </p>
        )}

        <div className="ml-auto flex items-center gap-1 shrink-0">
          {view === "chart" && (
            <>
              <Tooltip label="Reduzir zoom">
                <button
                  onClick={() => step(1 / 1.25)}
                  aria-label="Reduzir zoom"
                  className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-hover hover:text-ink transition-colors duration-150"
                >
                  <Minus className="size-4" />
                </button>
              </Tooltip>
              <span className="hidden sm:block font-mono text-xs text-ink-dim w-12 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Tooltip label="Aumentar zoom">
                <button
                  onClick={() => step(1.25)}
                  aria-label="Aumentar zoom"
                  className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-hover hover:text-ink transition-colors duration-150"
                >
                  <Plus className="size-4" />
                </button>
              </Tooltip>
              <Tooltip label="Girar 90° — para cartas em paisagem">
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  aria-label="Girar 90°"
                  className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-hover hover:text-ink transition-colors duration-150"
                >
                  <RotateCw className="size-3.5" />
                </button>
              </Tooltip>
              <Tooltip label="Ajustar à tela e à orientação original">
                <button
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                  aria-label="Ajustar à tela"
                  className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-hover hover:text-ink transition-colors duration-150"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </Tooltip>
            </>
          )}

          <Tooltip label="Abrir em tela cheia">
            <button
              onClick={toggleFullscreen}
              aria-label="Tela cheia"
              className="grid place-items-center size-7 rounded-md text-ink-dim hover:bg-hover hover:text-ink transition-colors duration-150"
            >
              <Maximize2 className="size-3.5" />
            </button>
          </Tooltip>
          <Tooltip label="Abrir o PDF original em nova aba">
            <a
              href={chart.file}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-ink-dim hover:bg-hover hover:text-ink transition-colors duration-150"
            >
              <ExternalLink className="size-3.5" />
              <span className="hidden sm:inline">PDF</span>
            </a>
          </Tooltip>
        </div>
      </div>

      {view === "chart" ? (
        <PdfCanvas
          key={chart.file}
          src={chart.file}
          zoom={zoom}
          rotation={rotation}
          onZoomChange={setZoom}
        />
      ) : procedure && geometry ? (
        <ProcedureMap
          icao={icao}
          procedure={procedure}
          geometry={geometry}
          focusCallsign={focus}
        />
      ) : (
        <div className="dot-grid flex-1 min-h-0 grid place-items-center">
          <p className="font-mono text-xs text-ink-faint">
            Mapa não disponível para este procedimento.
          </p>
        </div>
      )}

      <div className="h-7 shrink-0 flex items-center gap-3 px-3 border-t border-line bg-panel">
        <span className="font-mono text-[10px] text-ink-faint truncate">
          {view === "chart"
            ? `${chart.type} · ${chart.name} · AIRAC ${chart.amdt} · ${chart.date}`
            : `Fixos e altitudes conforme publicado pelo DECEA · ${geometry?.syncedAt ?? ""}`}
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
