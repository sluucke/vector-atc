/**
 * Real scheduled flight plans (CGNA RPL), summarised per city pair. Built by
 * scripts/sync-rpl.ts in vector-atc-data. Pure: the server loads the file and passes it in.
 */
import type { Parity } from "./airways";

export interface RplRoute {
  level: number;
  route: string;
  count: number;
}

export interface RplPair {
  flights: number;
  /** Cruising level (hundreds of feet) to number of filed flights. */
  levels: Record<number, number>;
  /** Most filed routes, most common first. */
  routes: RplRoute[];
}

export interface RplDatabase {
  cycle: string;
  source: string;
  syncedAt: string;
  /** "SBBR-SBTE" -> summary */
  pairs: Record<string, RplPair>;
}

export interface RplEvidence {
  flights: number;
  /** Share of filed flights whose level has this parity, 0..1. */
  oddShare: number;
  evenShare: number;
  /** The parity at least 80% of the scheduled flights use, if any. */
  dominant: Parity | null;
  topRoute: RplRoute | null;
  cycle: string;
}

const parityOf = (level: number): Parity | null =>
  level % 10 !== 0 ? null : (level / 10) % 2 === 1 ? "odd" : "even";

export function rplEvidence(
  db: RplDatabase | null,
  departure: string | null,
  arrival: string | null
): RplEvidence | null {
  if (!db || !departure || !arrival) return null;
  const pair = db.pairs[`${departure.toUpperCase()}-${arrival.toUpperCase()}`];
  if (!pair || pair.flights === 0) return null;

  let odd = 0;
  let even = 0;
  for (const [level, n] of Object.entries(pair.levels)) {
    const p = parityOf(Number(level));
    if (p === "odd") odd += n;
    if (p === "even") even += n;
  }
  const total = odd + even || 1;
  return {
    flights: pair.flights,
    oddShare: odd / total,
    evenShare: even / total,
    dominant: odd / total >= 0.8 ? "odd" : even / total >= 0.8 ? "even" : null,
    topRoute: pair.routes[0] ?? null,
    cycle: db.cycle,
  };
}
