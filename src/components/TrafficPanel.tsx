"use client";

import { useEffect, useMemo, useState } from "react";
import { PlaneLanding, PlaneTakeoff, RefreshCw, TriangleAlert } from "lucide-react";
import type { AirportTraffic, LiveFlight } from "@/lib/ivao/types";
import type { Procedure } from "@/lib/types";

const POLL_MS = 20_000;
const TABS = ["TODOS", "CHEGADAS", "PARTIDAS"] as const;
type Tab = (typeof TABS)[number];

type Row = LiveFlight & { kind: "arrival" | "departure" };

function ProcedureTag({
  flight,
  names,
}: {
  flight: LiveFlight;
  names: Map<string, Procedure>;
}) {
  const { procedure } = flight;

  if (procedure.confidence === "unknown") {
    return (
      <span className="font-mono text-[9px] text-ink-faint">
        procedimento não identificado
      </span>
    );
  }

  const label = procedure.procedureIds
    .map((id) => names.get(id)?.name ?? id)
    .join(" / ");
  const confirmed = procedure.confidence === "confirmed";

  return (
    <span
      title={
        confirmed
          ? `Designador ${procedure.designator} presente no plano de voo`
          : `Inferido pelo fixo ${procedure.fix} — não declarado no plano`
      }
      className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
        confirmed
          ? "bg-signal/12 text-signal"
          : "bg-warn/10 text-warn border border-dashed border-warn/40"
      }`}
    >
      {confirmed ? label : `~ ${label}`}
    </span>
  );
}

export default function TrafficPanel({
  icao,
  procedures,
}: {
  icao: string;
  procedures: Procedure[];
}) {
  const [traffic, setTraffic] = useState<AirportTraffic | null>(null);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>("TODOS");
  const [query, setQuery] = useState("");
  const [openCallsign, setOpenCallsign] = useState<string | null>(null);

  const names = useMemo(
    () => new Map(procedures.map((p) => [p.id, p])),
    [procedures]
  );

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/ivao/traffic?icao=${icao}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as AirportTraffic;
        if (!cancelled) {
          setTraffic(data);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    void poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [icao]);

  const rows = useMemo<Row[]>(() => {
    if (!traffic) return [];
    const all: Row[] = [
      ...traffic.arrivals.map((f) => ({ ...f, kind: "arrival" as const })),
      ...traffic.departures.map((f) => ({ ...f, kind: "departure" as const })),
    ];

    const byTab = all.filter(
      (r) =>
        tab === "TODOS" ||
        (tab === "CHEGADAS" ? r.kind === "arrival" : r.kind === "departure")
    );

    const term = query.trim().toUpperCase();
    if (!term) return byTab;

    return byTab.filter((r) =>
      [
        r.callsign,
        r.aircraftIcao,
        r.departure,
        r.destination,
        r.flightLevel,
        r.procedure.fix,
        r.procedure.designator,
        ...r.procedure.procedureIds.map((id) => names.get(id)?.name ?? ""),
        ...r.procedure.procedureIds.map((id) => names.get(id)?.runway ?? ""),
      ]
        .filter(Boolean)
        .some((value) => String(value).toUpperCase().includes(term))
    );
  }, [traffic, tab, query, names]);

  const counts = {
    TODOS: (traffic?.arrivals.length ?? 0) + (traffic?.departures.length ?? 0),
    CHEGADAS: traffic?.arrivals.length ?? 0,
    PARTIDAS: traffic?.departures.length ?? 0,
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="shrink-0 p-3 space-y-2 border-b border-line">
        <div className="flex gap-1 p-0.5 rounded-lg bg-black/25">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1 rounded-md font-mono text-[10px] font-medium transition-colors duration-150 ${
                tab === t
                  ? "bg-signal/15 text-signal"
                  : "text-ink-faint hover:text-ink-dim"
              }`}
            >
              {t}
              <span className="ml-1 opacity-60">{counts[t]}</span>
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por SID/STAR, fixo, RWY, destino…"
          className="w-full px-2.5 py-1.5 rounded-md bg-black/25 border border-line text-[11px] outline-none focus:border-signal/50 placeholder:text-ink-faint"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="flex items-center gap-2 px-3 py-4 text-[11px] text-warn">
            <TriangleAlert className="size-3.5 shrink-0" />
            Não foi possível ler a rede IVAO.
          </p>
        )}

        {!error && !traffic && (
          <p className="flex items-center gap-2 px-3 py-4 text-[11px] text-ink-faint">
            <RefreshCw className="size-3.5 animate-spin" />
            Consultando a rede…
          </p>
        )}

        {traffic && rows.length === 0 && (
          <p className="px-3 py-6 text-center text-[11px] text-ink-faint">
            {counts.TODOS === 0
              ? `Nenhum tráfego IVAO para ${icao} no momento.`
              : "Nenhum voo corresponde ao filtro."}
          </p>
        )}

        {rows.map((flight) => {
          const open = openCallsign === flight.callsign;
          const distance =
            flight.kind === "arrival"
              ? flight.arrivalDistance
              : flight.departureDistance;

          return (
            <button
              key={`${flight.kind}-${flight.callsign}`}
              onClick={() =>
                setOpenCallsign(open ? null : flight.callsign)
              }
              className={`w-full text-left px-3 py-2 border-b border-line transition-colors duration-150 ${
                open ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-2">
                {flight.kind === "arrival" ? (
                  <PlaneLanding className="size-3.5 shrink-0 text-warn" />
                ) : (
                  <PlaneTakeoff className="size-3.5 shrink-0 text-signal" />
                )}
                <span className="font-mono text-[12px] font-medium">
                  {flight.callsign}
                </span>
                <span className="font-mono text-[10px] text-ink-faint">
                  {flight.aircraftIcao ?? "—"}
                </span>
                {distance !== null && (
                  <span className="ml-auto font-mono text-[10px] text-ink-faint tabular-nums">
                    {Math.round(distance)} NM
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-ink-dim">
                <span>
                  {flight.departure ?? "????"} → {flight.destination ?? "????"}
                </span>
                {flight.state && (
                  <span className="text-ink-faint">· {flight.state}</span>
                )}
              </div>

              <div className="mt-1">
                <ProcedureTag flight={flight} names={names} />
              </div>

              {open && (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono text-[10px] text-ink-faint">
                  <dt>Nível</dt>
                  <dd className="text-ink-dim">{flight.flightLevel ?? "—"}</dd>
                  <dt>Regras</dt>
                  <dd className="text-ink-dim">{flight.flightRules ?? "—"}</dd>
                  <dt>Altitude</dt>
                  <dd className="text-ink-dim">
                    {flight.altitude !== null
                      ? `${flight.altitude} ft`
                      : "—"}{" "}
                    {flight.groundSpeed !== null && `· ${flight.groundSpeed} kt`}
                  </dd>
                  <dt>Alternativa</dt>
                  <dd className="text-ink-dim">{flight.alternate ?? "—"}</dd>
                  <dt className="col-span-2 pt-1 text-ink-faint">Rota</dt>
                  <dd className="col-span-2 text-ink-dim break-words leading-relaxed">
                    {flight.route ?? "—"}
                  </dd>
                </dl>
              )}
            </button>
          );
        })}
      </div>

      {traffic && (
        <p className="shrink-0 px-3 py-1.5 border-t border-line font-mono text-[9px] text-ink-faint">
          IVAO whazzup · {new Date(traffic.updatedAt).toLocaleTimeString("pt-BR")}
        </p>
      )}
    </div>
  );
}
