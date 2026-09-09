import { NextResponse } from "next/server";
import { getAirportMeta } from "@/lib/content";
import { getMetar } from "@/lib/ops/metar";
import { getNotams } from "@/lib/ops/notam";
import {
  calculateTransitionLevel,
  type TransitionLevelResult,
} from "@/lib/ops/transition";
import type { MetarReport } from "@/lib/ops/metar";
import type { Notam } from "@/lib/ops/notam";

export const dynamic = "force-dynamic";

export interface AirportDynamicContext {
  icao: string;
  metar: MetarReport | null;
  metarError: boolean;
  transitionLevel: TransitionLevelResult | null;
  notams: Notam[];
  notamsUpdatedAt: string | null;
  notamsError: boolean;
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

  const [metarResult, notamResult] = await Promise.allSettled([
    getMetar(code),
    getNotams(code),
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

  const body: AirportDynamicContext = {
    icao: code,
    metar,
    metarError: metarResult.status === "rejected",
    transitionLevel,
    notams: notamResult.status === "fulfilled" ? notamResult.value.notams : [],
    notamsUpdatedAt:
      notamResult.status === "fulfilled" ? notamResult.value.updatedAt : null,
    notamsError: notamResult.status === "rejected",
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(body);
}
