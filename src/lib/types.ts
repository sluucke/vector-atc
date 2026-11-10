export type ProcedureCategory = "RNAV" | "CONV";
export type ProcedureType = "SID" | "STAR";

export interface Transition {
  fix: string;
  desc: string;
}

export interface Procedure {
  id: string;
  type: ProcedureType;
  runway: string;
  name: string;
  category: ProcedureCategory;
  /** Stable chart key from charts.json (AISWEB chart code, e.g. "SV02F"). */
  chartKey: string;
  /** Key into geometry.json procedures; null when no coding table is published. */
  geometryKey: string | null;
  fixes: string[];
  notes?: string;

  // SID-specific
  commonRoute?: string | null;
  transitions?: Transition[];

  // STAR-specific
  entryFixes?: string[];
  route?: string | null;
  iaf?: string | null;
}

export interface Chart {
  key: string;
  type: string;
  name: string;
  code: string;
  amdt: string;
  date: string;
  file: string;
}

export interface ChartCatalog {
  icao: string;
  syncedAt: string;
  source: string;
  charts: Chart[];
}

export interface GeoPoint {
  lat: number;
  lon: number;
}

/** One coded leg of a procedure, as published in the DECEA coding table. */
export interface Leg {
  seq: number;
  fix: string | null;
  pathTerminator: string;
  altitude: string | null;
  distance: number | null;
  /** True course of the leg, when the table publishes one. */
  course?: number | null;
}

export interface ProcedureGeometry {
  title: string;
  chartKey: string;
  /** Transition name ("RWY" is the common segment) to its ordered legs. */
  transitions: Record<string, Leg[]>;
}

export interface AirportGeometry {
  icao: string;
  syncedAt: string;
  fixes: Record<string, GeoPoint>;
  runwayPoints: Record<string, { thr?: GeoPoint; der?: GeoPoint }>;
  /** True course of each runway, as published on the departure's first leg. */
  runwayCourses?: Record<string, number>;
  procedures: Record<string, ProcedureGeometry>;
}

export interface AiracInfo {
  cycle: string;
  effective: string;
  checkedAt: string;
  source: string;
}

export interface AirportFrequencies {
  dAtis: string[];
  twr: string[];
  app: string[];
  acc: string[];
  accExtended?: string[];
  /** Callsigns of the IVAO positions these frequencies belong to. */
  network?: { source: string; app: string | null; acc: string };
}

/** Static, slowly-changing operational data kept in our own dataset. */
export interface AirportOperationalData {
  /** Feet. The value controllers use on the network. */
  transitionAltitude: number;
  transitionAltitudeSource: string;
  /** Degrees, negative to the west, as printed on the aerodrome's charts. */
  magneticVariation?: number;
  magneticVariationSource?: string;
  /** Set when the published chart disagrees with the operational value. */
  chartTransitionAltitude?: number;
  chartTransitionAltitudeNote?: string;
  ivaoWikiUrl?: string;
}

export interface AirportMeta {
  icao: string;
  name: string;
  elevation: string;
  ta: string;
  msa: string;
  fir: string;
  operational?: AirportOperationalData;
  airac: AiracInfo;
  frequencies: AirportFrequencies;
  runways: string[];
  runwaysNote?: string;
  observations: string[];
}
