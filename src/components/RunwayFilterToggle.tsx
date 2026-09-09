"use client";

import { Check } from "lucide-react";
import Tooltip from "./Tooltip";
import { useAirportContext } from "./AirportContextProvider";

/** Narrows every list to the runway actually being worked. */
export default function RunwayFilterToggle() {
  const { runways, onlyActiveRunway, setOnlyActiveRunway } =
    useAirportContext();

  if (runways.length === 0) return null;

  return (
    <Tooltip
      label={
        onlyActiveRunway
          ? "Mostrando só o que serve a pista em uso. Clique para ver todas."
          : `Esconder procedimentos e cartas que não servem a RWY ${runways.join("/")}.`
      }
    >
      <button
        onClick={() => setOnlyActiveRunway(!onlyActiveRunway)}
        aria-pressed={onlyActiveRunway}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md border transition-colors duration-150 ${
          onlyActiveRunway
            ? "border-ok/40 bg-ok/12 text-ok"
            : "border-line bg-inset text-ink-dim hover:text-ink hover:border-line-strong"
        }`}
      >
        <span
          className={`grid place-items-center size-3.5 rounded-[3px] border shrink-0 ${
            onlyActiveRunway ? "border-ok bg-ok text-panel" : "border-line-strong"
          }`}
        >
          {onlyActiveRunway && <Check className="size-2.5" strokeWidth={3.5} />}
        </span>

        <span className="font-mono text-[10px] text-left leading-tight">
          Somente a pista em uso
        </span>

        <span
          className={`ml-auto shrink-0 font-mono text-[10px] font-medium px-1.5 py-0.5 rounded ${
            onlyActiveRunway ? "bg-ok/20" : "bg-hover text-ink-faint"
          }`}
        >
          {runways.join("/")}
        </span>
      </button>
    </Tooltip>
  );
}
