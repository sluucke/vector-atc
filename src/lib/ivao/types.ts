/**
 * Shapes verified against the live feed at https://api.ivao.aero/v2/tracker/whazzup
 * (2026-09-09). Only fields IVAO actually publishes are modelled here.
 */

export type IvaoTrackState =
  | "On Blocks"
  | "Boarding"
  | "Departing"
  | "Initial Climb"
  | "En Route"
  | "Approach"
  | "Landed";

export interface WhazzupTrack {
  altitude: number;
  altitudeDifference: number;
  arrivalDistance: number | null;
  departureDistance: number | null;
  groundSpeed: number;
  heading: number;
  latitude: number;
  longitude: number;
  onGround: boolean;
  state: IvaoTrackState | string;
  timestamp: string;
  transponder: number;
  transponderMode: string;
}

export interface WhazzupFlightPlan {
  id: number;
  aircraftId: string | null;
  departureId: string | null;
  arrivalId: string | null;
  alternativeId: string | null;
  route: string | null;
  remarks: string | null;
  speed: string | null;
  level: string | null;
  flightRules: string | null;
  eet: number | null;
  aircraft?: {
    icaoCode: string | null;
    model: string | null;
    wakeTurbulence: string | null;
  } | null;
}

export interface WhazzupPilot {
  id: number;
  userId: number;
  callsign: string;
  rating: number;
  lastTrack?: WhazzupTrack | null;
  flightPlan?: WhazzupFlightPlan | null;
}

export interface WhazzupAtc {
  id: number;
  userId: number;
  callsign: string;
  rating: number;
  atcSession?: { frequency: number; position: string } | null;
  lastTrack?: WhazzupTrack | null;
  atis?: { lines: string[]; revision: string; timestamp: string } | null;
}

export interface Whazzup {
  updatedAt: string;
  clients: {
    pilots: WhazzupPilot[];
    atcs: WhazzupAtc[];
    followMe: unknown[];
    observers: unknown[];
  };
}

/** ATC suffixes IVAO publishes in `atcSession.position`. */
export type AtcPosition =
  | "DEL"
  | "GND"
  | "TWR"
  | "APP"
  | "DEP"
  | "CTR"
  | "FSS"
  | "OBS";

export interface ControllerPosition {
  callsign: string;
  /** Parsed prefix — an ICAO code for aerodrome positions, an FIR/UIR otherwise. */
  prefix: string;
  position: AtcPosition | string;
  /** Set only when the position is bound to a single aerodrome. */
  airport: string | null;
  frequency: number | null;
  atis: string | null;
  since: string | null;
}

/** How confident we are that a flight is flying a given procedure. */
export type ProcedureConfidence = "confirmed" | "inferred" | "unknown";

export interface ProcedureMatch {
  confidence: ProcedureConfidence;
  /** Procedure ids from the aerodrome's procedures.json. Several when ambiguous. */
  procedureIds: string[];
  /** Designator as written in the flight plan, when confirmed. */
  designator: string | null;
  /** Entry (STAR) or exit (SID) fix the match was derived from. */
  fix: string | null;
}

export interface LiveFlight {
  callsign: string;
  userId: number;

  aircraftIcao: string | null;
  aircraftModel: string | null;
  wakeTurbulence: string | null;

  departure: string | null;
  destination: string | null;
  alternate: string | null;
  route: string | null;
  flightRules: string | null;
  flightLevel: string | null;

  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  groundSpeed: number | null;
  heading: number | null;
  onGround: boolean;

  /** Raw IVAO state — never inferred. */
  state: string | null;
  /** Distance to the arrival aerodrome in NM, as published by IVAO. */
  arrivalDistance: number | null;
  departureDistance: number | null;

  /** Our own association against the aerodrome's published procedures. */
  procedure: ProcedureMatch;
}

export interface AirportTraffic {
  icao: string;
  updatedAt: string;
  arrivals: LiveFlight[];
  departures: LiveFlight[];
}

export interface IvaoSession {
  vid: string;
  name: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
}

/** What the browser is allowed to see — never includes tokens. */
export interface IvaoSessionView {
  connected: boolean;
  vid: string | null;
  name: string | null;
  online: boolean;
  controller: ControllerPosition | null;
  error?: string;
}
