import "server-only";
import { createCache } from "@/lib/ops/aisweb";

/**
 * IVAO Data API (https://api.ivao.aero/docs/data). Everything here needs the
 * `apiKey` header, so it only works when IVAO_API_KEY is configured; callers
 * must degrade to the public sources when it isn't.
 */
const BASE = "https://api.ivao.aero";

export function hasApiKey(): boolean {
  return Boolean(process.env.IVAO_API_KEY);
}

async function ivaoFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.IVAO_API_KEY;
  if (!apiKey) throw new Error("IVAO_API_KEY is not configured");

  const res = await fetch(`${BASE}${path}`, {
    headers: { apiKey, "user-agent": "vector-atc-charts/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`IVAO ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

/** A network NOTAM published by IVAO — not a real-world AIS NOTAM. */
export interface IvaoNotam {
  id: number;
  name: string;
  description: string;
  startTime: string | null;
  endTime: string | null;
  military: boolean;
}

interface Paginated<T> {
  items: T[];
  totalItems: number;
}

const notamCache = createCache<IvaoNotam[]>(15 * 60 * 1000);

export async function getIvaoNotams(icao: string): Promise<IvaoNotam[]> {
  if (!hasApiKey()) return [];
  return notamCache(icao.toUpperCase(), async () => {
    const data = await ivaoFetch<Paginated<IvaoNotam>>(
      `/v2/airports/${icao.toUpperCase()}/notams`
    );
    return data.items ?? [];
  });
}

export interface IvaoMetar {
  airportIcao: string;
  metar: string;
  updatedAt: string;
}

const metarCache = createCache<IvaoMetar | null>(5 * 60 * 1000);

export async function getIvaoMetar(icao: string): Promise<IvaoMetar | null> {
  if (!hasApiKey()) return null;
  return metarCache(icao.toUpperCase(), () =>
    ivaoFetch<IvaoMetar>(`/v2/airports/${icao.toUpperCase()}/metar`)
  );
}
