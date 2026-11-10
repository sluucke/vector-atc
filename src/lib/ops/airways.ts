/**
 * ATS routes from the AIP Brasil (ENR 3) and the cruising-level parity each
 * segment carries, plus the reading of a flight plan route against them.
 *
 * The data comes from scripts/sync-airways.ts in vector-atc-data. Pure functions only: the server
 * loads the file and passes it in, so this module stays importable anywhere.
 */
import type { GeoPoint } from "@/lib/types";

/**
 * Which direction along the segment a parity applies to. "forward" is the
 * order the AIP lists the points in, "backward" the reverse, null neither.
 */
export type LevelDirection = "forward" | "backward" | null;

export interface AirwaySegment {
  from: string;
  to: string;
  /** Magnetic track from `from` to `to`, as published. */
  track: number;
  reverseTrack: number;
  lengthNm: number | null;
  /** "FL245", "UNL", "5000FT"... as published. */
  lower: string | null;
  upper: string | null;
  odd: LevelDirection;
  even: LevelDirection;
  /**
   * One-way segment where the AIP table does not show which column its mark
   * is in; the parity was taken from the semicircular rule for that direction.
   */
  inferred?: boolean;
}

export interface AirwayDatabase {
  source: string;
  syncedAt: string;
  points: Record<string, GeoPoint>;
  routes: Record<string, AirwaySegment[]>;
}

export type Parity = "odd" | "even";

/** One leg of a filed route, with what the AIP or the geometry says about it. */
export interface RouteLeg {
  from: string;
  to: string;
  /** Airway designator, or "DCT". */
  via: string;
  /** Planned level on this leg, in hundreds of feet. */
  level: number | null;
  /** Parity the leg requires; null when it cannot be told. */
  required: Parity | null;
  /** Where `required` came from. */
  basis: "airway" | "track" | null;
  /** Magnetic course of the leg, when it was computed or published. */
  magneticCourse: number | null;
  /** Airway flown against its only permitted direction. */
  wrongWay?: boolean;
  /** Planned level outside the airway's vertical limits. */
  outsideLimits?: boolean;
}

const toRad = Math.PI / 180;

export function trueCourse(a: GeoPoint, b: GeoPoint): number {
  const dLon = (b.lon - a.lon) * toRad;
  const l1 = a.lat * toRad;
  const l2 = b.lat * toRad;
  const y = Math.sin(dLon) * Math.cos(l2);
  const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon);
  return (Math.atan2(y, x) / toRad + 360) % 360;
}

const norm = (deg: number) => ((deg % 360) + 360) % 360;

/** "FL245" -> 245, "UNL" -> 999, "5000FT" -> 50 */
export function limitLevel(limit: string | null): number | null {
  if (!limit) return null;
  if (limit === "UNL") return 999;
  if (limit === "GND") return 0;
  if (limit.startsWith("FL")) return Number(limit.slice(2));
  const ft = limit.match(/^(\d+)FT$/);
  return ft ? Number(ft[1]) / 100 : null;
}

/**
 * Magnetic variation near a point, measured from the AIP itself: on every
 * airway segment the published magnetic track and the true course between
 * its two points differ by exactly the local variation. The nearest segment
 * gives the value. Negative to the west.
 */
export function variationNear(db: AirwayDatabase, at: GeoPoint): number | null {
  let best: { d: number; v: number } | null = null;
  for (const segments of Object.values(db.routes)) {
    for (const s of segments) {
      const a = db.points[s.from];
      const b = db.points[s.to];
      if (!a || !b) continue;
      const mid = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
      const d = (mid.lat - at.lat) ** 2 + (mid.lon - at.lon) ** 2;
      if (best && d >= best.d) continue;
      // true = magnetic + variation
      const v = ((trueCourse(a, b) - s.track + 540) % 360) - 180;
      if (Math.abs(v) < 40) best = { d, v };
    }
  }
  return best ? Math.round(best.v * 10) / 10 : null;
}

/** Segments of an airway between two of its points, in flying order. */
function airwayLegs(
  segments: AirwaySegment[],
  entry: string,
  exit: string
): { segments: AirwaySegment[]; forward: boolean } | null {
  const order = [segments[0]?.from, ...segments.map((s) => s.to)];
  const i = order.indexOf(entry);
  const j = order.indexOf(exit);
  if (i < 0 || j < 0 || i === j) return null;
  return i < j
    ? { segments: segments.slice(i, j), forward: true }
    : { segments: segments.slice(j, i).reverse(), forward: false };
}

const ROUTE_LEVEL = /\/[NKM]\d{3,4}(?:F|A|S|M)(\d{3,4})$/;

/**
 * Splits a filed route into legs and states, for each, which parity the
 * cruising level must have: from the AIP allocation when the leg is an
 * airway, from the magnetic course between the two points when it is direct.
 *
 * Points the database does not know (a SID exit, a coordinate) break the
 * chain; their legs are skipped rather than guessed.
 */
export function analyseRoute(
  route: string,
  plannedLevel: number | null,
  db: AirwayDatabase,
  /** Courses this close to 000 or 180 are not called on a direct leg. */
  boundaryDeg = 5
): RouteLeg[] {
  const tokens = route
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean)
    // "N0450F360" alone sets speed and level for what follows.
    .flatMap((t) => (/^[NKM]\d{3,4}[FASM]\d{3,4}$/.test(t) ? [`/${t}`] : [t]));

  let level = plannedLevel;
  const legs: RouteLeg[] = [];
  let point: string | null = null;
  let via: string | null = null;

  const levelOf = (raw: string) => {
    const m = raw.match(ROUTE_LEVEL) ?? raw.match(/^\/[NKM]\d{3,4}[FASM](\d{3,4})$/);
    return m ? Number(m[1].length === 4 ? m[1].slice(0, 3) : m[1]) : null;
  };

  for (const raw of tokens) {
    if (raw.startsWith("/")) {
      level = levelOf(raw) ?? level;
      continue;
    }
    const [name] = raw.split("/");
    const change = raw.includes("/") ? levelOf(raw) : null;

    if (name === "DCT" || db.routes[name]) {
      via = name;
      continue;
    }

    if (db.points[name]) {
      if (point && via) {
        legs.push(...legsBetween(point, name, via, level, db, boundaryDeg));
      }
      point = name;
      via = null;
      if (change !== null) level = change;
      continue;
    }

    // Unknown token: SID/STAR designator, coordinate, aerodrome. Restart.
    point = null;
    via = null;
  }

  return legs;
}

function legsBetween(
  from: string,
  to: string,
  via: string,
  level: number | null,
  db: AirwayDatabase,
  boundaryDeg: number
): RouteLeg[] {
  if (via !== "DCT") {
    const found = airwayLegs(db.routes[via] ?? [], from, to);
    if (found) {
      return found.segments.map((s) => {
        const direction: LevelDirection = found.forward ? "forward" : "backward";
        const required: Parity | null =
          s.odd === direction ? "odd" : s.even === direction ? "even" : null;
        const lower = limitLevel(s.lower);
        const upper = limitLevel(s.upper);
        return {
          from: found.forward ? s.from : s.to,
          to: found.forward ? s.to : s.from,
          via,
          level,
          required,
          basis: required ? "airway" : null,
          magneticCourse: found.forward ? s.track : s.reverseTrack,
          wrongWay: !required && Boolean(s.odd || s.even),
          outsideLimits:
            level !== null &&
            ((lower !== null && level < lower) || (upper !== null && level > upper)),
        };
      });
    }
    // Points not on that airway: treat the leg as direct, honestly labelled.
  }

  const a = db.points[from];
  const b = db.points[to];
  const variation = variationNear(db, {
    lat: (a.lat + b.lat) / 2,
    lon: (a.lon + b.lon) / 2,
  });
  if (variation === null) {
    return [{ from, to, via, level, required: null, basis: null, magneticCourse: null }];
  }
  const magnetic = norm(trueCourse(a, b) - variation);
  const toBoundary = Math.min(Math.abs(((magnetic + 180) % 360) - 180), Math.abs(magnetic - 180));
  return [
    {
      from,
      to,
      via,
      level,
      required: toBoundary < boundaryDeg ? null : magnetic < 180 ? "odd" : "even",
      basis: toBoundary < boundaryDeg ? null : "track",
      magneticCourse: Math.round(magnetic),
    },
  ];
}
