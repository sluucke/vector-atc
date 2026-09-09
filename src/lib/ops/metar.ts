import "server-only";
import { aiswebFetch, createCache, xmlTag } from "./aisweb";

export interface MetarReport {
  icao: string;
  raw: string;
  /** hPa. Null when the report carries no altimeter group. */
  qnh: number | null;
  /** Day-of-month + UTC time from the report's own timestamp group. */
  observedAt: string | null;
  taf: string | null;
  fetchedAt: string;
}

/** METAR is issued hourly (SPECI in between), so a short cache is plenty. */
const cache = createCache<MetarReport | null>(5 * 60 * 1000);

/**
 * Altimeter groups: "Q1018" (hPa, used in Brazil) or "A2992" (inHg).
 * Reference: ICAO Annex 3 / WMO FM-15.
 */
export function parseQnh(raw: string): number | null {
  const hpa = raw.match(/\bQ(\d{4})\b/);
  if (hpa) return Number(hpa[1]);

  const inHg = raw.match(/\bA(\d{4})\b/);
  if (inHg) {
    const inches = Number(inHg[1]) / 100;
    return Math.round(inches * 33.8639 * 10) / 10;
  }

  return null;
}

/** "SBSV 090600Z ..." -> the 090600Z group. */
export function parseObservedAt(raw: string): string | null {
  return raw.match(/\b(\d{6}Z)\b/)?.[1] ?? null;
}

export async function getMetar(icao: string): Promise<MetarReport | null> {
  const code = icao.toUpperCase();

  return cache(code, async () => {
    const xml = await aiswebFetch("met", code);
    const raw = xmlTag(xml, "metar")?.replace(/=$/, "").trim();
    if (!raw) return null;

    return {
      icao: code,
      raw,
      qnh: parseQnh(raw),
      observedAt: parseObservedAt(raw),
      taf: xmlTag(xml, "taf")?.replace(/=$/, "").trim() ?? null,
      fetchedAt: new Date().toISOString(),
    };
  });
}
