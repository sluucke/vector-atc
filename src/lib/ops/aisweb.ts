import "server-only";

import { aiswebUrl } from "./aisweb-credentials";

/**
 * AISWEB (DECEA) is the official Brazilian AIS source and publishes both METAR
 * and NOTAM. Credentials come from aisweb-credentials.ts.
 */
export async function aiswebFetch(
  area: string,
  icao: string
): Promise<string> {
  const url = aiswebUrl(area, icao);

  const res = await fetch(url, {
    cache: "no-store",
    headers: { "user-agent": "vector-atc-charts/1.0" },
  });
  if (!res.ok) throw new Error(`AISWEB ${area} failed: ${res.status}`);
  return res.text();
}

export function xmlTag(xml: string, tag: string): string | null {
  const m = xml.match(
    new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`)
  );
  return m ? m[1].trim() : null;
}

/** Simple TTL cache shared by every request on this server instance. */
export function createCache<T>(ttlMs: number) {
  const entries = new Map<string, { value: T; at: number }>();
  const inFlight = new Map<string, Promise<T>>();

  return async function get(key: string, load: () => Promise<T>): Promise<T> {
    const hit = entries.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;

    const pending = inFlight.get(key);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const value = await load();
        entries.set(key, { value, at: Date.now() });
        return value;
      } catch (error) {
        // Stale data beats no data for an operational board.
        if (hit) return hit.value;
        throw error;
      } finally {
        inFlight.delete(key);
      }
    })();

    inFlight.set(key, promise);
    return promise;
  };
}
