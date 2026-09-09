import { NextResponse } from "next/server";
import { getIvaoConfig } from "@/lib/ivao/config";
import { readSession } from "@/lib/ivao/session";
import { getWhazzup } from "@/lib/ivao/whazzup";
import { parseController } from "@/lib/ivao/callsign";
import type { IvaoSessionView } from "@/lib/ivao/types";

export const dynamic = "force-dynamic";

/**
 * Being logged into an IVAO account is not the same as being connected to the
 * network, so the account VID is matched against the live ATC list.
 */
export async function GET() {
  const disconnected: IvaoSessionView = {
    connected: false,
    vid: null,
    name: null,
    online: false,
    controller: null,
  };

  if (!getIvaoConfig()) {
    return NextResponse.json({ ...disconnected, error: "not_configured" });
  }

  const session = await readSession();
  if (!session) return NextResponse.json(disconnected);

  const view: IvaoSessionView = {
    connected: true,
    vid: session.vid,
    name: session.name,
    online: false,
    controller: null,
  };

  try {
    const whazzup = await getWhazzup();
    const atc = whazzup.clients.atcs.find(
      (entry) => String(entry.userId) === session.vid
    );
    if (atc) {
      view.online = true;
      view.controller = parseController(atc);
    } else {
      const flying = whazzup.clients.pilots.some(
        (pilot) => String(pilot.userId) === session.vid
      );
      view.online = flying;
    }
  } catch (error) {
    console.error("IVAO whazzup lookup failed", error);
    view.error = "network_unavailable";
  }

  return NextResponse.json(view);
}
