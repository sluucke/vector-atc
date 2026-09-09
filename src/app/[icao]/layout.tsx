import { notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { IvaoSessionProvider } from "@/components/IvaoSessionProvider";
import { AirportContextProvider } from "@/components/AirportContextProvider";
import TopBar from "@/components/TopBar";
import AirportContextHeader from "@/components/AirportContextHeader";
import ProcedureBrowser from "@/components/ProcedureBrowser";
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

  const categories = ["SID", "STAR", "IAC", "ADC", "VAC", "PDC", "AOC"]
    .map((type) => ({
      type,
      count: charts.filter((c) => c.type === type).length,
    }))
    .filter((c) => c.count > 0);

  return (
    <IvaoSessionProvider>
      <AirportContextProvider icao={meta.icao}>
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
            <AirportContextHeader meta={meta} />

            <div className="flex-1 flex min-h-0">
              <ProcedureBrowser
                icao={meta.icao}
                procedures={procedures}
                charts={charts}
              />
              {props.children}
            </div>
          </div>
        </div>
      </AirportContextProvider>
    </IvaoSessionProvider>
  );
}
