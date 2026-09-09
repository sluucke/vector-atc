import { NextResponse, type NextRequest } from "next/server";
import { getAirportTraffic } from "@/lib/ivao/traffic";

export const dynamic = "force-dynamic";

/** Public feed, so traffic doesn't require the user to connect their account. */
export async function GET(request: NextRequest) {
  const icao = request.nextUrl.searchParams.get("icao");
  if (!icao || !/^[A-Za-z]{4}$/.test(icao)) {
    return NextResponse.json({ error: "invalid_icao" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getAirportTraffic(icao));
  } catch (error) {
    console.error("IVAO traffic failed", error);
    return NextResponse.json({ error: "network_unavailable" }, { status: 502 });
  }
}
