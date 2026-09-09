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
  chart: string;
  fixes: string[];
  notes?: string;

  // SID-specific
  commonRoute?: string;
  transitions?: Transition[];

  // STAR-specific
  entryFixes?: string[];
  route?: string;
  iaf?: string;
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
}

export interface AirportMeta {
  icao: string;
  name: string;
  elevation: string;
  ta: string;
  msa: string;
  fir: string;
  airac: AiracInfo;
  frequencies: AirportFrequencies;
  runways: string[];
  runwaysNote?: string;
  observations: string[];
}
