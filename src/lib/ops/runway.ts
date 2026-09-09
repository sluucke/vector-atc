import type { GeoPoint } from "@/lib/types";

export type RunwaySource = "atis" | "wind" | "unknown";

export interface RunwayInUse {
  runway: string | null;
  source: RunwaySource;
  /** Human-readable justification shown next to the selector. */
  detail: string | null;
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
  thresholds: Record<string, GeoPoint | undefined>;
  metar: string | null;
  atis: string | null;
}): RunwayInUse {
  if (atis) {
    const fromAtis = parseAtisRunway(atis, runways);
    if (fromAtis) {
      return {
        runway: fromAtis,
        source: "atis",
        detail: "informada no ATIS do controlador online",
      };
    }
  }

  const wind = metar ? parseWind(metar) : null;
  if (!wind || wind.direction === null || wind.speed < 1) {
    return {
      runway: null,
      source: "unknown",
      detail: wind ? "vento calmo ou variável" : "sem METAR",
    };
  }

  const scored = runways
    .map((runway) => {
      const from = thresholds[runway];
      const opposite = runways.find((r) => r !== runway && thresholds[r]);
      if (!from || !opposite) return null;
      const to = thresholds[opposite];
      if (!to) return null;
      return { runway, headwind: headwind(trueBearing(from, to), wind) };
    })
    .filter((entry): entry is { runway: string; headwind: number } =>
      Boolean(entry)
    )
    .sort((a, b) => b.headwind - a.headwind);

  if (scored.length === 0 || scored[0].headwind <= 0) {
    return {
      runway: null,
      source: "unknown",
      detail: "sem cabeceiras publicadas para calcular o vento",
    };
  }

  return {
    runway: scored[0].runway,
    source: "wind",
    detail: `estimada pelo vento ${String(wind.direction).padStart(3, "0")}°/${Math.round(wind.speed)}kt`,
  };
}
