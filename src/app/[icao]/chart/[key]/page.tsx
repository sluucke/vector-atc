import { Suspense } from "react";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import ChartWorkspace from "@/components/charts/ChartWorkspace";
import { CATEGORY_LABELS } from "@/lib/charts/relevance";
import {
  getAirportCodes,
  getAirportMeta,
  getChart,
  getCharts,
} from "@/lib/content";

export function generateStaticParams() {
  return getAirportCodes().flatMap((icao) =>
    getCharts(icao).map((chart) => ({
      icao: icao.toLowerCase(),
      key: chart.key,
    }))
  );
}

/** Charts with no procedure behind them — approach, aerodrome, visual, apron. */
export default async function ChartPage(
  props: PageProps<"/[icao]/chart/[key]">
) {
  const { icao, key } = await props.params;
  const meta = getAirportMeta(icao);
  const chart = getChart(icao, key);
  if (!meta || !chart) notFound();

  return (
    <>
      <Suspense
        fallback={<div className="flex-1 min-w-0 bg-content dot-grid" />}
      >
        <ChartWorkspace
          key={chart.key}
          icao={meta.icao}
          procedure={null}
          initialChartKey={chart.key}
          charts={getCharts(icao)}
          geometry={null}
        />
      </Suspense>

      <aside className="w-72 shrink-0 hidden lg:flex flex-col bg-panel border-l border-line overflow-y-auto">
        <div className="shrink-0 p-3 border-b border-line">
          <div className="flex items-center gap-2">
            <FileText className="size-3.5 text-ink-faint shrink-0" />
            <span className="font-mono text-sm font-semibold truncate">
              {chart.name}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-ink-faint">
            {chart.type} · {CATEGORY_LABELS[chart.type] ?? ""} · {meta.icao}
          </p>
        </div>

        <div className="p-3 border-b border-line">
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 font-mono text-[11px] text-ink-faint">
            <dt>AIRAC</dt>
            <dd className="text-ink-dim">{chart.amdt}</dd>
            <dt>Data</dt>
            <dd className="text-ink-dim">{chart.date}</dd>
            {chart.code && (
              <>
                <dt>Código</dt>
                <dd className="text-ink-dim">{chart.code}</dd>
              </>
            )}
          </dl>
        </div>


      </aside>
    </>
  );
}
