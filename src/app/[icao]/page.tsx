import { notFound } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import ProcedureTables from "@/components/ProcedureTables";
import { getAirportCodes, getAirportMeta, getProcedures } from "@/lib/content";

export function generateStaticParams() {
  return getAirportCodes().map((icao) => ({ icao: icao.toLowerCase() }));
}

function FreqCard({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-sm text-ink leading-relaxed">
        {values.join("  ")}
      </p>
    </div>
  );
}

export default async function AirportBriefingPage(
  props: PageProps<"/[icao]">
) {
  const { icao } = await props.params;
  const meta = getAirportMeta(icao);
  if (!meta) notFound();
  const procedures = getProcedures(icao);

  return (
    <>
      <div className="flex-1 min-w-0 overflow-y-auto bg-content p-5 space-y-6">
        <section>
          <h2 className="text-sm font-semibold tracking-wide mb-3">
            Frequências
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FreqCard label="D-ATIS" values={meta.frequencies.dAtis} />
            <FreqCard label="TWR" values={meta.frequencies.twr} />
            <FreqCard label="APP" values={meta.frequencies.app} />
            <FreqCard label="ACC" values={meta.frequencies.acc} />
          </div>
          {meta.frequencies.accExtended && (
            <p className="mt-2 font-mono text-[11px] text-ink-faint">
              ACC (lista estendida em cartas antigas):{" "}
              {meta.frequencies.accExtended.join("  ")}
            </p>
          )}
        </section>

        <ProcedureTables icao={meta.icao} procedures={procedures} type="SID" />
        <ProcedureTables icao={meta.icao} procedures={procedures} type="STAR" />
      </div>

      <aside className="w-72 shrink-0 hidden xl:flex flex-col bg-panel border-l border-line">
        <div className="shrink-0 px-4 h-11 flex items-center gap-2 border-b border-line">
          <TriangleAlert className="size-3.5 text-warn" />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Notas operacionais
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {meta.runwaysNote && (
            <div className="rounded-lg border-l-2 border-warn bg-warn/[0.06] p-3">
              <p className="text-[11px] leading-relaxed text-ink-dim">
                {meta.runwaysNote}
              </p>
            </div>
          )}
          {meta.observations.map((obs, i) => (
            <div
              key={i}
              className="rounded-lg border-l-2 border-signal/50 bg-white/[0.03] p-3"
            >
              <p className="text-[11px] leading-relaxed text-ink-dim">{obs}</p>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-line p-3">
          <p className="font-mono text-[10px] text-ink-faint leading-relaxed">
            Dados extraídos das cartas oficiais DECEA/AISWEB.
            <br />
            Verificado em {meta.airac.checkedAt}.
          </p>
        </div>
      </aside>
    </>
  );
}
