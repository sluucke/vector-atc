import type { IvaoNotam } from "@/lib/ivao/data-api";
import type { MetarReport } from "./metar";
import type { Notam } from "./notam-format";
import type { RunwayInUse } from "./runway";
import type { TransitionLevelResult } from "./transition";

/**
 * Everything that changes during a session at one aerodrome, served by
 * /api/airport/[icao] and polled by the airport context on the client.
 */
export interface AirportDynamicContext {
  icao: string;
  metar: MetarReport | null;
  metarError: boolean;
  transitionLevel: TransitionLevelResult | null;
  /** Real-world NOTAMs from the official Brazilian AIS. */
  notams: Notam[];
  notamsUpdatedAt: string | null;
  notamsError: boolean;
  /** IVAO network NOTAMs — division notices, not real-world AIS. */
  ivaoNotams: IvaoNotam[];
  /** Detected only — the controller can always override in the UI. */
  runwayInUse: RunwayInUse;
  runways: string[];
  updatedAt: string;
}
