import { notFound } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { IvaoSessionProvider } from "@/providers/IvaoSessionProvider";
import { categoryEntries } from "@/lib/charts/inventory";
import { CATEGORY_ORDER } from "@/lib/charts/relevance";
import { AirportContextProvider } from "@/providers/AirportContextProvider";
import TopBar from "@/components/layout/TopBar";
import AirportContextHeader from "@/components/airport/AirportContextHeader";
import AirportOpsStrip from "@/components/airport/AirportOpsStrip";
import ProcedureBrowser from "@/components/charts/ProcedureBrowser";
import { MobilePaneProvider, PaneTabs } from "@/components/layout/MobilePanes";
import {
  getAirportCodes,
  getAirportMeta,
  getAllAirports,
  getCharts,
  getProcedures,
  getSearchIndex,
} from "@/lib/content";

export function generateStaticParams() {
  return getAirportCodes().map((icao) => ({ icao: icao.toLowerCase() }));
}

export default async function AirportLayout(props: LayoutProps<"/[icao]">) {
  const { icao } = await props.params;
  const meta = getAirportMeta(icao);
  if (!meta) notFound();

  const procedures = getProcedures(icao);
  const charts = getCharts(icao);

  // The phraseology examples read better with this aerodrome's own departures
  // than with invented names, and the one shown follows the runway in use.
  const departures = procedures
    .filter((p) => p.type === "SID")
    .map((p) => ({
      name: p.name,
      runway: p.runway,
      fix: p.transitions?.[0]?.fix ?? null,
    }));

  const categories = CATEGORY_ORDER
    .map((type) => ({
      type,
      count: categoryEntries(meta.icao, charts, procedures, type).length,
    }))
    .filter((c) => c.count > 0);

  return (
    <IvaoSessionProvider>
      <AirportContextProvider
        icao={meta.icao}
        availableCategories={categories.map((c) => c.type)}
      >
        <div className="h-screen flex overflow-hidden">
          <Sidebar
            airports={getAllAirports()}
            activeIcao={meta.icao}
            categories={categories}
          />

          <div className="flex-1 flex flex-col min-w-0">
            <TopBar
              entries={getSearchIndex()}
              station={`APP ${meta.icao}`}
              frequency={meta.frequencies.app[0]}
              availableIcaos={getAirportCodes()}
              currentIcao={meta.icao}
            />
            <AirportContextHeader meta={meta} departures={departures} />
            <AirportOpsStrip
              transitionAltitude={meta.operational?.transitionAltitude}
            />

            <MobilePaneProvider>
              <div className="flex-1 flex min-h-0">
                <ProcedureBrowser
                  icao={meta.icao}
                  procedures={procedures}
                  charts={charts}
                />
                {props.children}
              </div>
              <PaneTabs />
            </MobilePaneProvider>
          </div>
        </div>
      </AirportContextProvider>
    </IvaoSessionProvider>
  );
}
