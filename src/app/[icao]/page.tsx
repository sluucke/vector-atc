import { notFound } from "next/navigation";
import ChartCategorySection from "@/components/ChartCategorySection";
import OperationalPanel from "@/components/OperationalPanel";
import ProcedureTables from "@/components/ProcedureTables";
import {
  getAirportCodes,
  getAirportMeta,
  getCharts,
  getProcedures,
} from "@/lib/content";

/** Everything except SID/STAR, which render as detailed tables above. */
const OTHER_CATEGORIES = ["IAC", "ADC", "VAC", "PDC", "AOC"];

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
  const charts = getCharts(icao);

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

        {OTHER_CATEGORIES.map((category) => (
          <ChartCategorySection
            key={category}
            icao={meta.icao}
            charts={charts}
            category={category}
          />
        ))}
      </div>

      <OperationalPanel
        icao={meta.icao}
        procedures={procedures}
        notes={meta.observations}
        runwaysNote={meta.runwaysNote}
        checkedAt={meta.airac.checkedAt}
      />
    </>
  );
}
