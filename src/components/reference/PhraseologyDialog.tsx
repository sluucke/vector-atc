"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MessagesSquare, X } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import { useAirportContext } from "@/providers/AirportContextProvider";
import { PHRASEOLOGY, type PhraseologyPhase } from "@/lib/reference/phraseology";
import { formatFlightLevel } from "@/lib/ops/transition";
import { parseWind } from "@/lib/ops/runway";
import { servesRunway } from "@/lib/ops/runway-match";
import { langStore, type Lang } from "@/lib/reference/lang";
import type { AirportMeta } from "@/lib/types";

export interface Departure {
  name: string;
  runway: string;
  fix: string | null;
}

export default function PhraseologyDialog({
  meta,
  departures,
}: {
  meta: AirportMeta;
  /** This aerodrome's own departures, so the examples are not invented. */
  departures: Departure[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip label="Fraseologia padrão por fase do voo">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 shrink-0 cursor-pointer px-2 py-1 rounded-md text-ink-dim hover:bg-hover hover:text-ink transition-colors duration-150"
        >
          <MessagesSquare className="size-3.5" />
          <span className="font-mono text-[10px]">FRASEOLOGIA</span>
        </button>
      </Tooltip>

      {open && (
        <PhraseologySheet
          meta={meta}
          departures={departures}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function PhraseologySheet({
  meta,
  departures,
  onClose,
}: {
  meta: AirportMeta;
  departures: Departure[];
  onClose: () => void;
}) {
  const { data, runway, runways } = useAirportContext();
  const stored = useSyncExternalStore(
    langStore.subscribe,
    langStore.get,
    () => "pt" as Lang
  );
  const [lang, setLang] = useState<Lang>(stored);
  const [phase, setPhase] = useState<PhraseologyPhase>(PHRASEOLOGY[0]);

  // Escape has to work wherever focus landed, so it is bound to the document.
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

  const wind = data?.metar?.raw ? parseWind(data.metar.raw) : null;
  const tl = data?.transitionLevel;

  // A clearance naming a departure for another runway would teach the wrong
  // thing, so the example follows the runway in use.
  const departure =
    departures.find((d) => servesRunway(d.runway, runways)) ?? departures[0];

  const values: Record<string, string> = {
    AD: meta.name.split(/[/—-]/)[0].trim(),
    ICAO: meta.icao,
    RWY: runway ?? meta.runways[0] ?? "—",
    QNH: data?.metar?.qnh ? String(data.metar.qnh) : "1013",
    TA: meta.operational?.transitionAltitude
      ? `${meta.operational.transitionAltitude} ${lang === "pt" ? "pés" : "feet"}`
      : lang === "pt"
        ? "publicada na carta"
        : "as published",
    TL:
      tl && tl.flightLevel !== null
        ? formatFlightLevel(tl.flightLevel)
        : lang === "pt"
          ? "conforme o QNH"
          : "as per QNH",
    TWR: meta.frequencies.twr[0] ?? "—",
    APP: meta.frequencies.app[0] ?? meta.frequencies.acc[0] ?? "—",
    SID: departure?.name ?? "RNAV",
    FIX:
      departure?.fix ??
      (lang === "pt" ? "o fixo publicado" : "the published fix"),
    CS: "GLO 1201",
    CS_VFR: "PP-ABC",
    WIND:
      wind && wind.direction !== null
        ? `${String(wind.direction).padStart(3, "0")} graus ${Math.round(wind.speed)} nós`
        : "130 graus 8 nós",
    WIND_EN:
      wind && wind.direction !== null
        ? `${String(wind.direction).padStart(3, "0")} degrees ${Math.round(wind.speed)} knots`
        : "130 degrees 8 knots",
  };

  const fill = (text: string) =>
    text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);

  const t = (pt: string, en: string) => (lang === "pt" ? pt : en);

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
          <MessagesSquare className="size-4 shrink-0 text-signal" />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {t("Fraseologia padrão", "Standard phraseology")}
            </p>
            <p className="font-mono text-[10px] text-ink-faint truncate">
              {meta.icao} · {t("pista", "runway")} {values.RWY} · QNH{" "}
              {values.QNH}
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

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
          <nav className="shrink-0 sm:w-52 sm:border-r border-b sm:border-b-0 border-line overflow-x-auto sm:overflow-y-auto flex sm:flex-col gap-1 p-2">
            {PHRASEOLOGY.map((item) => (
              <button
                key={item.id}
                onClick={() => setPhase(item)}
                className={`shrink-0 cursor-pointer text-left whitespace-nowrap sm:whitespace-normal px-2.5 py-1.5 rounded-md text-xs transition-colors duration-150 ${
                  phase.id === item.id
                    ? "bg-signal/11 text-signal"
                    : "text-ink-dim hover:bg-hover hover:text-ink"
                }`}
              >
                {item.label[lang]}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
            <p className="text-xs text-ink-dim leading-relaxed">
              {phase.hint[lang]}
            </p>

            {phase.exchanges.map((exchange, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-line bg-panel px-3 py-2.5"
              >
                <span
                  className={`shrink-0 mt-0.5 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    exchange.who === "atc"
                      ? "bg-signal/15 text-signal"
                      : "bg-warn/15 text-warn"
                  }`}
                >
                  {exchange.who === "atc" ? "ATC" : t("PILOTO", "PILOT")}
                </span>
                <p className="font-mono text-[13px] leading-relaxed text-ink">
                  {fill(exchange[lang])}
                </p>
              </div>
            ))}
          </div>
        </div>

        <footer className="shrink-0 px-4 py-2 border-t border-line">
          <p className="font-mono text-[10px] text-ink-faint leading-relaxed">
            {t(
              "Português conforme o MCA 100-16 do DECEA; inglês conforme o ICAO Doc 9432. Exemplos de estudo — na dúvida, vale o manual.",
              "Portuguese follows DECEA MCA 100-16; English follows ICAO Doc 9432. Study examples — the manuals are what count."
            )}
          </p>
        </footer>
      </div>
    </div>
  );
}
