import fs from "node:fs";
import path from "node:path";
import type { AirportMeta, Procedure } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");

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

export function getAllAirports(): AirportMeta[] {
  return getAirportCodes()
    .map((icao) => getAirportMeta(icao))
    .filter((meta): meta is AirportMeta => meta !== null);
}
