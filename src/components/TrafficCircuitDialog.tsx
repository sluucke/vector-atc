"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { RectangleHorizontal, X } from "lucide-react";
import Tooltip from "./Tooltip";
import { useAirportContext } from "./AirportContextProvider";
import {
  CIRCUIT_LEGS,
  CIRCUIT_ALTITUDES,
  mirrorHeading,
  type CircuitDirection,
} from "@/lib/traffic-circuit";
import { langStore, type Lang } from "@/lib/ui-lang";

/** Runway "13" -> magnetic heading 130. */
function runwayHeading(runway: string): number {
  const digits = runway.match(/^(\d{2})/)?.[1];
  return digits ? Number(digits) * 10 : 0;
}

export default function TrafficCircuitDialog({
  runways,
}: {
  runways: string[];
}) {
  const [open, setOpen] = useState(false);

  if (runways.length === 0) return null;

  return (
    <>
      <Tooltip label="Circuito de tráfego padrão">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 shrink-0 cursor-pointer px-2 py-1 rounded-md text-ink-dim hover:bg-hover hover:text-ink transition-colors duration-150"
        >
          <RectangleHorizontal className="size-3.5" />
          <span className="font-mono text-[10px]">CIRCUITO</span>
        </button>
      </Tooltip>

      {open && (
        <CircuitSheet runways={runways} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/** Builds the rectangular pattern, runway pointing up, one side per direction. */
function circuitPoints(direction: CircuitDirection) {
  const side = direction === "left" ? -1 : 1;
  const U = 78; // upwind leg length
  const W = 60; // crosswind/base width
  const B = 22; // downwind overshoot past the threshold

  const threshold = { x: 0, y: 0 };
  const crosswindTurn = { x: 0, y: -U };
  const downwindTurn = { x: side * W, y: -U };
  const baseTurn = { x: side * W, y: B };
  const finalStart = { x: 0, y: B };

  return {
    upwind: [threshold, crosswindTurn],
    crosswind: [crosswindTurn, downwindTurn],
    downwind: [downwindTurn, baseTurn],
    base: [baseTurn, finalStart],
    final: [finalStart, threshold],
    labelPoints: {
      takeoff: mid(threshold, crosswindTurn),
      crosswind: mid(crosswindTurn, downwindTurn),
      downwind: mid(downwindTurn, baseTurn),
      base: mid(baseTurn, finalStart),
      final: mid(finalStart, threshold),
    },
  };
}

function mid(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Short enough to fit the diagram without running past the frame. */
const DIAGRAM_LABEL: Record<string, { pt: string; en: string }> = {
  takeoff: { pt: "Decolagem", en: "Take-off" },
  crosswind: { pt: "Través", en: "Xwind" },
  downwind: { pt: "Vento", en: "Downwind" },
  base: { pt: "Base", en: "Base" },
  final: { pt: "Final", en: "Final" },
};

function toPath(points: { x: number; y: number }[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

function CircuitSheet({
  runways,
  onClose,
}: {
  runways: string[];
  onClose: () => void;
}) {
  const { runway: activeRunway } = useAirportContext();
  const stored = useSyncExternalStore(
    langStore.subscribe,
    langStore.get,
    () => "pt" as Lang
  );
  const [lang, setLang] = useState<Lang>(stored);
  const [runway, setRunway] = useState(activeRunway ?? runways[0]);
  const [direction, setDirection] = useState<CircuitDirection>("left");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function choose(next: Lang) {
    setLang(next);
    langStore.set(next);
  }

  const t = (pt: string, en: string) => (lang === "pt" ? pt : en);
  const heading = runwayHeading(runway);
  const points = circuitPoints(direction);

  const legHeading = (relative: number) =>
    (heading + mirrorHeading(relative, direction) + 360) % 360;

  const dirWord = direction === "left" ? t("esquerda", "left") : t("direita", "right");
  const fillNote = (note: string) => note.replace("{DIR}", dirWord);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-start justify-center sm:pt-[8vh] px-0 sm:px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-full sm:h-auto sm:max-h-[84vh] flex flex-col sm:rounded-xl bg-raised border border-line-strong shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-line">
          <RectangleHorizontal className="size-4 shrink-0 text-signal" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {t("Circuito de tráfego", "Traffic circuit")}
            </p>
            <p className="font-mono text-[10px] text-ink-faint truncate">
              {t("padrão retangular · ICAO Anexo 2", "standard rectangular · ICAO Annex 2")}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <div className="flex gap-0.5 p-0.5 rounded-lg bg-inset">
              {(
                [
                  ["pt", "PT-BR"],
                  ["en", "EN-US"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => choose(id)}
                  className={`cursor-pointer px-2 py-1 rounded-md font-mono text-[10px] font-medium transition-colors duration-150 ${
                    lang === id
                      ? "bg-signal/15 text-signal"
                      : "text-ink-faint hover:text-ink-dim"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              aria-label={t("Fechar", "Close")}
              className="grid place-items-center size-7 cursor-pointer rounded-md text-ink-faint hover:bg-hover hover:text-ink transition-colors duration-150"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-ink-faint">
                {t("PISTA", "RWY")}
              </span>
              <select
                value={runway}
                onChange={(e) => setRunway(e.target.value)}
                className="cursor-pointer rounded-md border border-line bg-inset px-2 py-1 font-mono text-xs text-ink"
              >
                {runways.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex gap-0.5 p-0.5 rounded-lg bg-inset">
              {(
                [
                  ["left", t("Esquerda", "Left")],
                  ["right", t("Direita", "Right")],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setDirection(id)}
                  className={`cursor-pointer px-2.5 py-1 rounded-md font-mono text-[10px] font-medium transition-colors duration-150 ${
                    direction === id
                      ? "bg-signal/15 text-signal"
                      : "text-ink-faint hover:text-ink-dim"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="font-mono text-[10px] text-ink-faint">
              {t(
                "Padrão à esquerda salvo indicação contrária na VAC/ATIS.",
                "Left-hand by default unless the VAC or ATIS says otherwise."
              )}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,20rem)_1fr]">
            <div className="dot-grid rounded-xl border border-line bg-content p-3">
              <svg
                viewBox="-130 -110 260 220"
                className="w-full h-auto"
                aria-label={t("Diagrama do circuito de tráfego", "Traffic circuit diagram")}
              >
                <g stroke="var(--color-signal)" strokeWidth="2" fill="none">
                  <path d={toPath(points.upwind)} strokeDasharray="4 3" opacity="0.6" />
                  <path d={toPath(points.crosswind)} />
                  <path d={toPath(points.downwind)} />
                  <path d={toPath(points.base)} />
                  <path d={toPath(points.final)} markerEnd="url(#arrow)" />
                </g>
                <defs>
                  <marker
                    id="arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="4"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-signal)" />
                  </marker>
                </defs>

                {/* Runway */}
                <rect
                  x={-5}
                  y={-14}
                  width={10}
                  height={28}
                  fill="var(--color-ink-faint)"
                  opacity="0.35"
                />

                {Object.entries(points.labelPoints).map(([id, p]) => {
                  const side = direction === "left" ? -1 : 1;
                  // Each leg is offset away from the rectangle it belongs to,
                  // rather than nudged from its raw midpoint: a vertical leg
                  // needs horizontal clearance, a horizontal one needs vertical.
                  const isRunwayLeg = id === "takeoff" || id === "final";
                  const isDownwind = id === "downwind";
                  // Runway-leg labels sit on the side opposite the rectangle,
                  // clear of it; the downwind label sits further out on the
                  // rectangle's own side.
                  const x = isRunwayLeg
                    ? p.x - side * 8
                    : isDownwind
                      ? p.x + side * 10
                      : p.x;
                  const y = isRunwayLeg || isDownwind ? p.y : id === "crosswind" ? p.y - 8 : p.y + 14;
                  const anchor = isRunwayLeg
                    ? side < 0
                      ? "start"
                      : "end"
                    : isDownwind
                      ? side < 0
                        ? "end"
                        : "start"
                      : "middle";
                  return (
                    <text
                      key={id}
                      x={x}
                      y={y}
                      textAnchor={anchor}
                      dy={isRunwayLeg || isDownwind ? "3" : "0"}
                      className="fill-current text-ink-dim"
                      style={{ fontSize: 9, fontFamily: "var(--font-mono)" }}
                    >
                      {DIAGRAM_LABEL[id]?.[lang] ?? id}
                    </text>
                  );
                })}
              </svg>
            </div>

            <div className="space-y-1.5">
              {CIRCUIT_LEGS.map((leg) => (
                <div
                  key={leg.id}
                  className="rounded-lg border border-line bg-panel px-3 py-2"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs font-medium text-ink">
                      {leg.label[lang]}
                    </span>
                    <span className="font-mono text-[10px] text-signal">
                      {String(Math.round(legHeading(leg.relativeHeading))).padStart(3, "0")}°
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-ink-dim leading-relaxed">
                    {fillNote(leg.note[lang])}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint mb-2">
              {t("Altitude de circuito (AGL)", "Circuit altitude (AGL)")}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {CIRCUIT_ALTITUDES.map((row) => (
                <div
                  key={row.category.en}
                  className="rounded-lg border border-line bg-panel px-3 py-2"
                >
                  <p className="font-mono text-[10px] text-ink-faint">
                    {row.category[lang]}
                  </p>
                  <p className="font-mono text-sm text-ink">{row.agl} ft</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="shrink-0 px-4 py-2 border-t border-line">
          <p className="font-mono text-[10px] text-ink-faint leading-relaxed">
            {t(
              "Padrão genérico conforme ICAO Anexo 2 / ICA 100-12 — direção, altitude e ponto de entrada reais são os publicados na VAC e no ATIS de cada aeródromo.",
              "Generic pattern per ICAO Annex 2 / ICA 100-12 — the actual direction, altitude and entry point are whatever the VAC and ATIS publish for this field."
            )}
          </p>
        </footer>
      </div>
    </div>
  );
}
