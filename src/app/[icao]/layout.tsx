import { notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import AirportContextHeader from "@/components/AirportContextHeader";
import ProcedureBrowser from "@/components/ProcedureBrowser";
import {
  getAirportCodes,
  getAirportMeta,
  getAllAirports,
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

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar airports={getAllAirports()} activeIcao={meta.icao} />

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
          <ProcedureBrowser icao={meta.icao} procedures={procedures} />
          {props.children}
        </div>
      </div>
    </div>
  );
}
