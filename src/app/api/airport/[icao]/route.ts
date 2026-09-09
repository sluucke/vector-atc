import { NextResponse } from "next/server";
import { getAirportMeta, getGeometry } from "@/lib/content";
import { parseController } from "@/lib/ivao/callsign";
import { getWhazzup } from "@/lib/ivao/whazzup";
import { detectRunwayInUse, type RunwayInUse } from "@/lib/ops/runway";
import { getIvaoNotams, type IvaoNotam } from "@/lib/ivao/data-api";
import { getMetar } from "@/lib/ops/metar";
import { getNotams } from "@/lib/ops/notam";
import {
  calculateTransitionLevel,
  type TransitionLevelResult,
} from "@/lib/ops/transition";
import type { MetarReport } from "@/lib/ops/metar";
import type { Notam } from "@/lib/ops/notam-format";

export const dynamic = "force-dynamic";

export interface AirportDynamicContext {
  icao: string;
  metar: MetarReport | null;
  metarError: boolean;
  transitionLevel: TransitionLevelResult | null;
  /** Real-world NOTAMs from the official Brazilian AIS. */
  notams: Notam[];
  notamsUpdatedAt: string | null;
  notamsError: boolean;
  /** IVAO network NOTAMs — division notices, not real-world AIS. */
  ivaoNotams: IvaoNotam[];
  /** Detected only — the controller can always override in the UI. */
  runwayInUse: RunwayInUse;
  runways: string[];
  updatedAt: string;
}

/**
 * One consolidated call per airport. Each source is settled independently so a
 * single outage degrades that section only — the rest of the briefing stands.
 */
export async function GET(_: Request, ctx: RouteContext<"/api/airport/[icao]">) {
  const { icao } = await ctx.params;
  const code = icao.toUpperCase();

  const meta = getAirportMeta(code);
  if (!meta) {
    return NextResponse.json({ error: "unknown_airport" }, { status: 404 });
  }

  const [metarResult, notamResult, ivaoNotamResult, whazzupResult] =
    await Promise.allSettled([
      getMetar(code),
      getNotams(code),
      getIvaoNotams(code),
      getWhazzup(),
    ]);

  const metar =
    metarResult.status === "fulfilled" ? metarResult.value : null;

  const ta = meta.operational?.transitionAltitude;
  const transitionLevel =
    ta === undefined
      ? null
      : calculateTransitionLevel({
          transitionAltitude: ta,
          qnh: metar?.qnh ?? null,
        });

  // An ATIS from a controller working the field beats any wind guess.
  const atis =
    whazzupResult.status === "fulfilled"
      ? (whazzupResult.value.clients.atcs
          .filter((entry) => parseController(entry).airport === code)
          .map((entry) => entry.atis?.lines?.join(" "))
          .find(Boolean) ?? null)
      : null;

  const geometry = getGeometry(code);
  // Prefer a published threshold; the departure end describes the same strip
  // from the other side, so it works too once the direction is accounted for.
  const thresholds = Object.fromEntries(
    Object.entries(geometry?.runwayPoints ?? {}).map(([rwy, point]) => [
      rwy,
      point.thr
        ? { point: point.thr, kind: "thr" as const }
        : point.der
          ? { point: point.der, kind: "der" as const }
          : undefined,
    ])
  );

  const runwayInUse = detectRunwayInUse({
    runways: meta.runways,
    thresholds,
    courses: geometry?.runwayCourses ?? {},
    metar: metar?.raw ?? null,
    atis,
  });

  const body: AirportDynamicContext = {
    icao: code,
    metar,
    metarError: metarResult.status === "rejected",
    transitionLevel,
    notams: notamResult.status === "fulfilled" ? notamResult.value.notams : [],
    notamsUpdatedAt:
      notamResult.status === "fulfilled" ? notamResult.value.updatedAt : null,
    notamsError: notamResult.status === "rejected",
    ivaoNotams:
      ivaoNotamResult.status === "fulfilled" ? ivaoNotamResult.value : [],
    runwayInUse,
    runways: meta.runways,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(body);
}
