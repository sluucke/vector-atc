"use client";

import { useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { useAirportContext } from "./AirportContextProvider";
import { formatNotamTime } from "@/lib/ops/notam-format";

type Source = "DECEA" | "IVAO";

export default function NotamPanel({ icao }: { icao: string }) {
  const { data, error } = useAirportContext();
  const [source, setSource] = useState<Source>("DECEA");

  const decea = data?.notams ?? [];
  const ivao = data?.ivaoNotams ?? [];

  return (
    <div className="flex flex-col min-h-0">
      <div className="shrink-0 p-3 border-b border-line">
        <div className="flex gap-1 p-0.5 rounded-lg bg-black/25">
          {(
            [
              ["DECEA", decea.length],
              ["IVAO", ivao.length],
            ] as const
          ).map(([id, count]) => (
            <button
              key={id}
              onClick={() => setSource(id)}
              className={`flex-1 py-1 rounded-md font-mono text-[10px] font-medium transition-colors duration-150 ${
                source === id
                  ? "bg-signal/15 text-signal"
                  : "text-ink-faint hover:text-ink-dim"
              }`}
            >
              {id}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          ))}
        </div>
        <p className="mt-1.5 font-mono text-[9px] text-ink-faint">
          {source === "DECEA"
            ? "NOTAM reais do AIS brasileiro"
            : "avisos da rede IVAO — não são NOTAM reais"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {error && (
          <p className="flex items-center gap-2 text-[11px] text-warn">
            <TriangleAlert className="size-3.5 shrink-0" />
            Não foi possível obter os NOTAM.
          </p>
        )}

        {!error && !data && (
          <p className="flex items-center gap-2 text-[11px] text-ink-faint">
            <RefreshCw className="size-3.5 animate-spin" />
            Consultando…
          </p>
        )}

        {data && source === "DECEA" && decea.length === 0 && (
          <p className="py-6 text-center text-[11px] text-ink-faint">
            Nenhum NOTAM DECEA para {icao}.
          </p>
        )}

        {data && source === "IVAO" && ivao.length === 0 && (
          <p className="py-6 text-center text-[11px] text-ink-faint">
            Nenhum aviso da rede IVAO para {icao}.
          </p>
        )}

        {source === "DECEA" &&
          decea.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border-l-2 border-warn/60 bg-white/[0.03] p-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-medium text-ink">
                  {n.number}
                </span>
                {n.code && (
                  <span className="font-mono text-[9px] px-1 rounded bg-white/[0.06] text-ink-faint">
                    {n.code}
                  </span>
                )}
                {n.category && (
                  <span className="ml-auto font-mono text-[9px] text-ink-faint">
                    {n.category}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">
                {n.text}
              </p>
              {(n.validFrom || n.validTo) && (
                <p className="mt-1 font-mono text-[9px] text-ink-faint">
                  {formatNotamTime(n.validFrom) ?? "?"} —{" "}
                  {formatNotamTime(n.validTo) ?? "?"}
                </p>
              )}
            </div>
          ))}

        {source === "IVAO" &&
          ivao.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border-l-2 border-signal/60 bg-white/[0.03] p-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-medium text-ink">
                  {n.name}
                </span>
                {n.military && (
                  <span className="ml-auto font-mono text-[9px] text-ink-faint">
                    militar
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-ink-dim">
                {n.description}
              </p>
              {n.startTime && (
                <p className="mt-1 font-mono text-[9px] text-ink-faint">
                  {n.startTime.slice(0, 16).replace("T", " ")}Z
                  {n.endTime ? ` — ${n.endTime.slice(0, 16).replace("T", " ")}Z` : ""}
                </p>
              )}
            </div>
          ))}
      </div>

      {data?.notamsUpdatedAt && source === "DECEA" && (
        <p className="shrink-0 px-3 py-1.5 border-t border-line font-mono text-[9px] text-ink-faint">
          AISWEB · {data.notamsUpdatedAt}
        </p>
      )}
    </div>
  );
}
