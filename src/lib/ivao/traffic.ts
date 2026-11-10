import "server-only";
import {
  getAirportMeta,
  getAirways,
  getGeometry,
  getProcedures,
  getRpl,
} from "@/lib/content";
import { getWhazzup } from "./whazzup";
import { matchProcedure } from "./procedure-match";
import { analyseRoute } from "@/lib/ops/airways";
import { checkCruiseLevel, parseLevel } from "@/lib/ops/cruise-level";
import { rplEvidence } from "@/lib/ops/rpl";
import { trueBearing } from "@/lib/ops/runway";
import type { GeoPoint } from "@/lib/types";
import type {
  AirportTraffic,
  LiveFlight,
  ProcedureMatch,
  WhazzupPilot,
} from "./types";

/** Beyond this a departure is en route and no longer the field's problem. */
const DEPARTURE_RANGE_NM = 250;

/**
 * Closer than this to the aerodrome, the bearing between the field and the
 * aircraft is the circuit or the approach, not the leg being flown.
 */
const LEG_MIN_NM = 25;

/** Where the aerodrome is, averaged over whatever runway ends we hold. */
function aerodromePoint(icao: string): GeoPoint | null {
  const points = Object.values(getGeometry(icao)?.runwayPoints ?? {}).flatMap(
    (end) => [end.thr, end.der].filter(Boolean) as GeoPoint[]
  );
  if (points.length === 0) return null;
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / points.length,
    lon: points.reduce((s, p) => s + p.lon, 0) / points.length,
  };
}

/**
 * True course of the leg: outbound from the field for a departure, inbound to
 * it for an arrival. That is the direction the cruising level answers to, and
 * unlike the reported heading it survives a SID, a vector or a dogleg.
 */
function legCourse(
  field: GeoPoint | null,
  aircraft: GeoPoint | null,
  kind: "arrival" | "departure",
  distanceNm: number | null
): number | null {
  if (!field || !aircraft) return null;
  if (distanceNm !== null && distanceNm < LEG_MIN_NM) return null;
  return kind === "departure"
    ? trueBearing(field, aircraft)
    : trueBearing(aircraft, field);
}

/** The filed route read against the AIP airways, when the data is present. */
function routeLegs(route: string | null | undefined, level: string | null | undefined) {
  const airways = getAirways();
  if (!airways || !route) return [];
  return analyseRoute(route, parseLevel(level), airways);
}

function toLiveFlight(
  pilot: WhazzupPilot,
  procedure: ProcedureMatch,
  variation: number | null,
  field: GeoPoint | null,
  kind: "arrival" | "departure"
): LiveFlight {
  const plan = pilot.flightPlan ?? null;
  const track = pilot.lastTrack ?? null;

  const position =
    track && track.latitude !== null && track.longitude !== null
      ? { lat: track.latitude, lon: track.longitude }
      : null;
  const course = legCourse(
    field,
    position,
    kind,
    kind === "departure"
      ? (track?.departureDistance ?? null)
      : (track?.arrivalDistance ?? null)
  );

  return {
    callsign: pilot.callsign,
    userId: pilot.userId,

    aircraftIcao: plan?.aircraft?.icaoCode ?? plan?.aircraftId ?? null,
    aircraftModel: plan?.aircraft?.model ?? null,
    wakeTurbulence: plan?.aircraft?.wakeTurbulence ?? null,

    departure: plan?.departureId ?? null,
    destination: plan?.arrivalId ?? null,
    alternate: plan?.alternativeId ?? null,
    route: plan?.route ?? null,
    flightRules: plan?.flightRules ?? null,
    flightLevel: plan?.level ?? null,

    latitude: track?.latitude ?? null,
    longitude: track?.longitude ?? null,
    altitude: track?.altitude ?? null,
    groundSpeed: track?.groundSpeed ?? null,
    heading: track?.heading ?? null,
    onGround: track?.onGround ?? false,

    state: track?.state ?? null,
    arrivalDistance: track?.arrivalDistance ?? null,
    departureDistance: track?.departureDistance ?? null,

    equipment: plan?.aircraftEquipments ?? null,

    procedure,
    levelCheck: checkCruiseLevel({
      level: plan?.level,
      course,
      flightRules: plan?.flightRules,
      equipment: plan?.aircraftEquipments,
      variation,
      route: routeLegs(plan?.route, plan?.level),
      rpl: rplEvidence(getRpl(), plan?.departureId ?? null, plan?.arrivalId ?? null),
    }),
  };
}

export async function getAirportTraffic(
  icao: string
): Promise<AirportTraffic> {
  const code = icao.toUpperCase();
  const [whazzup, procedures] = [await getWhazzup(), getProcedures(code)];
  // The rule counts magnetic course; this aerodrome's published variation is
  // the best local conversion we have for its own traffic.
  const variation = getAirportMeta(code)?.operational?.magneticVariation ?? null;
  const field = aerodromePoint(code);

  const arrivals: LiveFlight[] = [];
  const departures: LiveFlight[] = [];

  for (const pilot of whazzup.clients.pilots) {
    const plan = pilot.flightPlan;
    if (!plan) continue;

    if (plan.arrivalId?.toUpperCase() === code) {
      arrivals.push(
        toLiveFlight(
          pilot,
          matchProcedure(plan.route, procedures, "STAR"),
          variation,
          field,
          "arrival"
        )
      );
    }

    if (plan.departureId?.toUpperCase() === code) {
      const distance = pilot.lastTrack?.departureDistance;
      const nearby =
        distance === null ||
        distance === undefined ||
        distance <= DEPARTURE_RANGE_NM;
      if (nearby) {
        departures.push(
          toLiveFlight(
            pilot,
            matchProcedure(plan.route, procedures, "SID"),
            variation,
            field,
            "departure"
          )
        );
      }
    }
  }

  const byDistance = (
    a: number | null | undefined,
    b: number | null | undefined
  ) => (a ?? Number.MAX_SAFE_INTEGER) - (b ?? Number.MAX_SAFE_INTEGER);

  arrivals.sort((a, b) => byDistance(a.arrivalDistance, b.arrivalDistance));
  departures.sort((a, b) =>
    byDistance(a.departureDistance, b.departureDistance)
  );

  return { icao: code, updatedAt: whazzup.updatedAt, arrivals, departures };
}
