import { notFound } from "next/navigation";
import CategoryGate from "@/components/airport/CategoryGate";
import ChartCategorySection from "@/components/charts/ChartCategorySection";
import MainPane from "@/components/layout/MainPane";
import OperationalPanel from "@/components/operations/OperationalPanel";
import ProcedureTables from "@/components/charts/ProcedureTables";
import {
  getAirportCodes,
  getAirportMeta,
  getCharts,
  getProcedures,
} from "@/lib/content";

/** Everything except SID/STAR, which render as detailed tables above. */
const OTHER_CATEGORIES = ["IAC", "ADC", "VAC", "REA", "PDC", "AOC"];

export function generateStaticParams() {
  return getAirportCodes().map((icao) => ({ icao: icao.toLowerCase() }));
}

function FreqCard({
  label,
  values,
  position,
}: {
  label: string;
  values: string[];
  /** IVAO callsign, when these are the network's frequencies. */
  position?: string | null;
}) {
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-sm text-ink leading-relaxed">
        {values.length > 0 ? values.join("  ") : "—"}
      </p>
      {position && (
        <p className="mt-1.5 font-mono text-[10px] text-ink-faint">
          {position}
        </p>
      )}
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
      <MainPane className="flex-1 min-w-0 overflow-y-auto bg-content p-4 sm:p-5 space-y-6">
        <section>
          <h2 className="text-sm font-semibold tracking-wide mb-3">
            Frequências
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <FreqCard label="D-ATIS" values={meta.frequencies.dAtis} />
            <FreqCard label="TWR" values={meta.frequencies.twr} />
            <FreqCard
              label="APP"
              values={meta.frequencies.app}
              position={meta.frequencies.network?.app}
            />
            <FreqCard
              label="ACC"
              values={meta.frequencies.acc}
              position={meta.frequencies.network?.acc}
            />
          </div>
          {meta.frequencies.accExtended && (
            <p className="mt-2 font-mono text-[11px] text-ink-faint">
              Setores do ACC: {meta.frequencies.accExtended.join("  ")}
            </p>
          )}
          {meta.frequencies.network && (
            <p className="mt-1 font-mono text-[11px] text-ink-faint">
              {meta.frequencies.network.source}
            </p>
          )}
        </section>

        {(["SID", "STAR"] as const).map((type) => (
          <CategoryGate key={type} category={type}>
            <ProcedureTables
              icao={meta.icao}
              procedures={procedures}
              charts={charts}
              type={type}
            />
          </CategoryGate>
        ))}

        {OTHER_CATEGORIES.map((category) => (
          <CategoryGate key={category} category={category}>
            <ChartCategorySection
              icao={meta.icao}
              charts={charts}
              category={category}
            />
          </CategoryGate>
        ))}
      </MainPane>

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
