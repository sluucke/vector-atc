import type { GeoPoint } from "@/lib/types";

export type RunwaySource = "atis" | "wind" | "unknown";

export interface RunwayInUse {
  /** Primary runway, for compact display. */
  runway: string | null;
  /**
   * Every runway in use. Parallels point the same way, so wind that favours
   * 11 favours 11L and 11R equally — both are in use.
   */
  runways: string[];
  source: RunwaySource;
  /** Human-readable justification shown next to the selector. */
  detail: string | null;
}

/** Parallels differ only by side, so they share a direction. */
const sameDirection = (a: string, b: string) =>
  a.slice(0, 2) === b.slice(0, 2);

/** 11L and 29R are the two ends of one strip; 10 pairs with 28. */
export function reciprocal(runway: string): string {
  const digits = runway.slice(0, 2);
  const side = runway.slice(2).toUpperCase();
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 1 || n > 36) return runway;
  const opposite = ((n + 17) % 36) + 1;
  const flipped = side === "L" ? "R" : side === "R" ? "L" : side;
  return String(opposite).padStart(2, "0") + flipped;
}
/** Initial true bearing from one threshold to the other, in degrees. */
export function trueBearing(from: GeoPoint, to: GeoPoint): number {
  const toRad = Math.PI / 180;
  const dLon = (to.lon - from.lon) * toRad;
  const lat1 = from.lat * toRad;
  const lat2 = to.lat * toRad;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (Math.atan2(y, x) / toRad + 360) % 360;
}

export interface MetarWind {
  /** Degrees TRUE — METAR wind is true-referenced, unlike tower-reported wind. */
  direction: number | null;
  speed: number;
  variable: boolean;
}

/** "08008KT", "08015G25KT", "VRB03KT", "00000KT" */
export function parseWind(raw: string): MetarWind | null {
  const m = raw.match(/\b(\d{3}|VRB)(\d{2,3})(?:G\d{2,3})?(KT|MPS)\b/);
  if (!m) return null;

  const speed = Number(m[2]) * (m[3] === "MPS" ? 1.94384 : 1);
  if (m[1] === "VRB") return { direction: null, speed, variable: true };

  return { direction: Number(m[1]), speed, variable: false };
}

/** Positive means wind along the runway direction. */
export function headwind(runwayBearing: number, wind: MetarWind): number {
  if (wind.direction === null) return 0;
  const angle = ((wind.direction - runwayBearing + 540) % 360) - 180;
  return wind.speed * Math.cos((angle * Math.PI) / 180);
}

/**
 * ATIS phrasing varies by controller client and language, so only the shapes
 * that unambiguously name a runway count as a match.
 */
export function parseAtisRunway(
  atis: string,
  runways: string[]
): string | null {
  const text = atis.toUpperCase();

  const patterns = [
    /(?:LDG|ARR|ARRIVAL|POUSO)\s*(?:RWY|RUNWAY|PISTA)?\s*(\d{2}[LRC]?)/,
    /(?:RWY|RUNWAY|PISTA)\s*(?:EM USO|IN USE)\s*(\d{2}[LRC]?)/,
    /(?:PISTA EM USO|RUNWAY IN USE)\s*(\d{2}[LRC]?)/,
    /(?:RWY|RUNWAY|PISTA)\s*(\d{2}[LRC]?)\s*(?:EM USO|IN USE)/,
    /(?:DEP|DEPARTURE|DECOLAGEM)\s*(?:RWY|RUNWAY|PISTA)?\s*(\d{2}[LRC]?)/,
  ];

  for (const pattern of patterns) {
    const hit = text.match(pattern)?.[1];
    if (hit && runways.includes(hit)) return hit;
  }

  return null;
}

/**
 * A controller's ATIS is authoritative; without one the wind decides, which is
 * a guess and is labelled as such.
 */
export function detectRunwayInUse({
  runways,
  thresholds,
  metar,
  atis,
}: {
  runways: string[];
  thresholds: Record<string, { point: GeoPoint; kind: "thr" | "der" } | undefined>;
  metar: string | null;
  atis: string | null;
}): RunwayInUse {
  if (atis) {
    const fromAtis = parseAtisRunway(atis, runways);
    if (fromAtis) {
      return {
        runway: fromAtis,
        runways: runways.filter((r) => sameDirection(r, fromAtis)),
        source: "atis",
        detail: "informada no ATIS do controlador online",
      };
    }
  }

  const wind = metar ? parseWind(metar) : null;
  if (!wind || wind.direction === null || wind.speed < 1) {
    return {
      runway: null,
      runways: [],
      source: "unknown",
      detail: wind ? "vento calmo ou variável" : "sem METAR",
    };
  }

  const scored = runways
    .map((runway) => {
      const other = reciprocal(runway);
      const here = thresholds[runway];
      const there = thresholds[other];
      if (!here || !there) return null;

      // Thresholds sit at the start of their own runway; departure ends sit
      // at the far end, so the pair is read in the opposite order.
      const bearing =
        here.kind === "thr"
          ? trueBearing(here.point, there.point)
          : trueBearing(there.point, here.point);

      return { runway, headwind: headwind(bearing, wind) };
    })
    .filter((entry): entry is { runway: string; headwind: number } =>
      Boolean(entry)
    )
    .sort((a, b) => b.headwind - a.headwind);
  if (scored.length === 0 || scored[0].headwind <= 0) {
    return {
      runway: null,
      runways: [],
      source: "unknown",
      detail: "sem cabeceiras publicadas para calcular o vento",
    };
  }

  const best = scored[0].runway;
  return {
    runway: best,
    runways: runways.filter((r) => sameDirection(r, best)),
    source: "wind",
    detail: `estimada pelo vento ${String(wind.direction).padStart(3, "0")}°/${Math.round(wind.speed)}kt`,
  };
}
