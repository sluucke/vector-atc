import "server-only";
import { getProcedures } from "@/lib/content";
import type { Procedure } from "@/lib/types";
import { getWhazzup } from "./whazzup";
import type {
  AirportTraffic,
  LiveFlight,
  ProcedureMatch,
  WhazzupPilot,
} from "./types";

/** Beyond this a departure is en route and no longer the field's problem. */
const DEPARTURE_RANGE_NM = 250;

const UNKNOWN: ProcedureMatch = {
  confidence: "unknown",
  procedureIds: [],
  designator: null,
  fix: null,
};

const normalize = (value: string) => value.replace(/[\s-]/g, "").toUpperCase();

/** Fixes a flight can join a SID at (its transitions) or leave a STAR from. */
function boundaryFixes(procedure: Procedure): string[] {
  return procedure.type === "SID"
    ? (procedure.transitions ?? []).map((t) => t.fix)
    : (procedure.entryFixes ?? []);
}

/**
 * IVAO publishes no structured SID/STAR field, so the association is derived
 * from the filed route:
 *   confirmed — the route names the procedure designator outright;
 *   inferred  — the route's first/last fix is a published boundary fix, which
 *               can match several procedures (usually one per runway);
 *   unknown   — neither.
 */
export function matchProcedure(
  route: string | null,
  procedures: Procedure[],
  kind: "SID" | "STAR"
): ProcedureMatch {
  if (!route) return UNKNOWN;

  const tokens = route.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return UNKNOWN;

  const candidates = procedures.filter((p) => p.type === kind);

  for (const token of tokens) {
    const hit = candidates.find((p) => normalize(p.name) === normalize(token));
    if (hit) {
      return {
        confidence: "confirmed",
        procedureIds: [hit.id],
        designator: token,
        fix: null,
      };
    }
  }

  // A departure joins the airway structure at its first filed fix; an arrival
  // leaves it at its last.
  const edge = kind === "SID" ? tokens[0] : tokens[tokens.length - 1];
  const viaFix = candidates.filter((p) => boundaryFixes(p).includes(edge));
  if (viaFix.length > 0) {
    return {
      confidence: "inferred",
      procedureIds: viaFix.map((p) => p.id),
      designator: null,
      fix: edge,
    };
  }

  return UNKNOWN;
}

function toLiveFlight(
  pilot: WhazzupPilot,
  procedure: ProcedureMatch
): LiveFlight {
  const plan = pilot.flightPlan ?? null;
  const track = pilot.lastTrack ?? null;

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

    procedure,
  };
}

export async function getAirportTraffic(
  icao: string
): Promise<AirportTraffic> {
  const code = icao.toUpperCase();
  const [whazzup, procedures] = [await getWhazzup(), getProcedures(code)];

  const arrivals: LiveFlight[] = [];
  const departures: LiveFlight[] = [];

  for (const pilot of whazzup.clients.pilots) {
    const plan = pilot.flightPlan;
    if (!plan) continue;

    if (plan.arrivalId?.toUpperCase() === code) {
      arrivals.push(
        toLiveFlight(pilot, matchProcedure(plan.route, procedures, "STAR"))
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
          toLiveFlight(pilot, matchProcedure(plan.route, procedures, "SID"))
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
