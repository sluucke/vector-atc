"use client";

import { useState } from "react";
import { ChevronDown, Radar, Wind, Wand2 } from "lucide-react";
import { useAirportContext } from "@/providers/AirportContextProvider";
import Tooltip from "@/components/ui/Tooltip";

const SOURCE_ICON = {
  atis: Radar,
  wind: Wind,
  unknown: Wand2,
} as const;

export default function RunwaySelect({ runways }: { runways: string[] }) {
  const {
    data,
    runway,
    runways: activeRunways,
    auto,
    setRunway,
  } = useAirportContext();
  const [open, setOpen] = useState(false);

  const detected = data?.runwayInUse ?? null;
  const source = detected?.source ?? "unknown";
  const Icon = SOURCE_ICON[source];
  // Parallels are in use together, so show them together.
  const label =
    activeRunways.length > 1 ? activeRunways.join("/") : (runway ?? null);

  return (
    <div className="relative shrink-0">
      <Tooltip
        label={
          detected?.detail
            ? `Pista em uso — ${detected.detail}`
            : "Selecionar a pista em uso"
        }
      >
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors duration-150 ${
          label
            ? "bg-ok/12 hover:bg-ok/20"
            : "bg-hover hover:bg-hover-strong"
        }`}
      >
        <span
          className={`size-1.5 rounded-full ${label ? "bg-ok" : "bg-ink-faint"}`}
        />
        <span
          className={`font-mono text-[10px] font-medium ${
            label ? "text-ok" : "text-ink-faint"
          }`}
        >
          {label ? "RWY " + label : "PISTA —"}
        </span>
        {!auto && (
          <span className="font-mono text-[9px] text-ink-faint">manual</span>
        )}
        <ChevronDown className="size-3 text-ink-faint" />
      </button>
      </Tooltip>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-30 w-60 rounded-lg bg-raised border border-line-strong shadow-2xl p-1.5">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Pista em uso
            </p>

            {runways.map((option) => {
              const active = activeRunways.includes(option);
              const isDetected = (detected?.runways ?? []).includes(option);
              return (
                <button
                  key={option}
                  onClick={() => {
                    setRunway(option);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors duration-150 ${
                    active ? "bg-signal/11 text-signal" : "hover:bg-hover"
                  }`}
                >
                  <span className="font-mono text-[12px] font-medium">
                    RWY {option}
                  </span>
                  {isDetected && (
                    <span className="ml-auto font-mono text-[9px] text-ink-faint">
                      detectada
                    </span>
                  )}
                </button>
              );
            })}

            <div className="mt-1 pt-1.5 border-t border-line px-2 pb-1">
              <p className="flex items-start gap-1.5 font-mono text-[9px] text-ink-faint leading-relaxed">
                <Icon className="size-3 shrink-0 mt-px" />
                {detected?.detail ?? "sem detecção disponível"}
              </p>
              {!auto && (
                <button
                  onClick={() => {
                    setRunway(null);
                    setOpen(false);
                  }}
                  className="mt-1.5 font-mono text-[9px] text-signal hover:underline"
                >
                  voltar à detecção automática
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
