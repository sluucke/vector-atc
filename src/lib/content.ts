import fs from "node:fs";
import path from "node:path";
import type { AirwayDatabase } from "./ops/airways";
import type { RplDatabase } from "./ops/rpl";
import type {
  AirportGeometry,
  AirportMeta,
  Chart,
  ChartCatalog,
  Procedure,
} from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");

/** Reads one national file from content/ once per server instance. */
function nationalFile<T>(name: string): () => T | null {
  let cached: T | null | undefined;
  return () => {
    if (cached !== undefined) return cached;
    const file = path.join(CONTENT_DIR, name);
    cached = fs.existsSync(file)
      ? (JSON.parse(fs.readFileSync(file, "utf-8")) as T)
      : null;
    return cached;
  };
}

/** ATS routes and points from the AIP (scripts/sync-airways.ts). */
export const getAirways = nationalFile<AirwayDatabase>("airways.json");

/** Scheduled flights per city pair (scripts/sync-rpl.ts). */
export const getRpl = nationalFile<RplDatabase>("rpl.json");

export function getAirportCodes(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export function getAirportMeta(icao: string): AirportMeta | null {
  const file = path.join(CONTENT_DIR, icao.toUpperCase(), "meta.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as AirportMeta;
}

export function getProcedures(icao: string): Procedure[] {
  const file = path.join(CONTENT_DIR, icao.toUpperCase(), "procedures.json");
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Procedure[];
}

export function getProcedure(icao: string, id: string): Procedure | null {
  const procedures = getProcedures(icao);
  return procedures.find((p) => p.id === id) ?? null;
}

function readJson<T>(icao: string, file: string): T | null {
  const full = path.join(CONTENT_DIR, icao.toUpperCase(), file);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, "utf-8")) as T;
}

export function getCharts(icao: string): Chart[] {
  return readJson<ChartCatalog>(icao, "charts.json")?.charts ?? [];
}

export function getChart(icao: string, key: string): Chart | null {
  return getCharts(icao).find((c) => c.key === key) ?? null;
}

export function getGeometry(icao: string): AirportGeometry | null {
  return readJson<AirportGeometry>(icao, "geometry.json");
}

export function getAllAirports(): AirportMeta[] {
  return getAirportCodes()
    .map((icao) => getAirportMeta(icao))
    .filter((meta): meta is AirportMeta => meta !== null);
}

export interface SearchEntry {
  icao: string;
  id: string;
  name: string;
  type: Procedure["type"];
  runway: string;
  category: Procedure["category"];
  fixes: string[];
  href: string;
}

export function getSearchIndex(): SearchEntry[] {
  return getAirportCodes().flatMap((icao) =>
    getProcedures(icao).map((p) => ({
      icao,
      id: p.id,
      name: p.name,
      type: p.type,
      runway: p.runway,
      category: p.category,
      fixes: p.fixes,
      href: `/${icao.toLowerCase()}/carta/${p.id}`,
    }))
  );
}
