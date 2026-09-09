import "server-only";
import { getProcedures } from "@/lib/content";
import { getWhazzup } from "./whazzup";
import { matchProcedure } from "./procedure-match";
import type {
  AirportTraffic,
  LiveFlight,
  ProcedureMatch,
  WhazzupPilot,
} from "./types";

/** Beyond this a departure is en route and no longer the field's problem. */
const DEPARTURE_RANGE_NM = 250;

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
