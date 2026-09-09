import "server-only";
import { WHAZZUP_MIN_INTERVAL_MS, WHAZZUP_URL } from "./config";
import type { Whazzup } from "./types";

let cache: { value: Whazzup; fetchedAt: number } | null = null;
let inFlight: Promise<Whazzup> | null = null;

/**
 * One shared fetch for the whole server. IVAO publishes a new file every 15s
 * and asks clients not to poll faster, so every caller inside that window gets
 * the cached payload and concurrent callers share a single request.
 */
export async function getWhazzup(): Promise<Whazzup> {
  if (cache && Date.now() - cache.fetchedAt < WHAZZUP_MIN_INTERVAL_MS) {
    return cache.value;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(WHAZZUP_URL, {
        cache: "no-store",
        headers: { "user-agent": "vector-atc-charts/1.0" },
      });
      if (!res.ok) throw new Error(`IVAO whazzup failed: ${res.status}`);

      const value = (await res.json()) as Whazzup;
      cache = { value, fetchedAt: Date.now() };
      return value;
    } catch (error) {
      // Serve the last good payload rather than blanking the board on a blip.
      if (cache) return cache.value;
      throw error;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
