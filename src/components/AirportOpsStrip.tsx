"use client";

import { useAirportContext } from "./AirportContextProvider";
import { formatFlightLevel } from "@/lib/ops/transition";

function Field({
  label,
  value,
  tone = "dim",
  title,
}: {
  label: string;
  value: string;
  tone?: "dim" | "ok" | "faint";
  title?: string;
}) {
  const colour =
    tone === "ok" ? "text-ok" : tone === "faint" ? "text-ink-faint" : "text-ink";
  return (
    <span className="flex items-baseline gap-1.5 shrink-0" title={title}>
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </span>
      <span className={`font-mono text-xs ${colour}`}>{value}</span>
    </span>
  );
}

/** TA is ours; TL is computed from it and the current QNH, never guessed. */
export default function AirportOpsStrip({
  transitionAltitude,
}: {
  transitionAltitude?: number;
}) {
  const { data, error } = useAirportContext();
  const metar = data?.metar ?? null;
  const tl = data?.transitionLevel ?? null;

  const tlValue =
    tl && tl.flightLevel !== null ? formatFlightLevel(tl.flightLevel) : "—";
  const tlReason =
    tl?.reason === "ok"
      ? `${tl.source} · QNH ${metar?.qnh}`
      : tl?.reason === "no_qnh"
        ? "sem QNH disponível"
        : tl?.reason === "ta_not_in_table"
          ? "TA fora da Tabela 7 da ICA 100-37"
          : tl?.reason === "qnh_out_of_range"
            ? "QNH fora das faixas da tabela"
            : "sem dados";

  return (
    <div className="shrink-0 flex flex-wrap items-baseline gap-x-4 sm:gap-x-5 gap-y-1 px-3 sm:px-4 py-1.5 bg-content border-b border-line">
      <Field
        label="TA"
        value={transitionAltitude ? `${transitionAltitude} ft` : "—"}
      />
      <Field
        label="TL"
        value={tlValue}
        tone={tlValue === "—" ? "faint" : "ok"}
        title={tlReason}
      />
      <Field
        label="QNH"
        value={metar?.qnh ? String(metar.qnh) : "—"}
        title={metar?.source ? `fonte: ${metar.source}` : undefined}
      />

      {metar?.raw ? (
        <span
          // On a phone the report gets a line of its own; squeezed onto the
          // row beside the fields it would truncate to nothing.
          className="font-mono text-[10px] text-ink-dim truncate min-w-0 w-full sm:w-auto sm:flex-1"
          title={metar.raw}
        >
          {metar.raw}
        </span>
      ) : (
        <span className="font-mono text-[10px] text-ink-faint">
          {error ? "METAR indisponível" : "carregando METAR…"}
        </span>
      )}

      {metar?.source && (
        <span className="font-mono text-[9px] text-ink-faint shrink-0">
          {metar.source}
          {metar.observedAt ? ` · ${metar.observedAt}` : ""}
        </span>
      )}
    </div>
  );
}
