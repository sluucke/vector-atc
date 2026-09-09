import { NextResponse, type NextRequest } from "next/server";
import { clearSession } from "@/lib/ivao/session";

export async function POST(request: NextRequest) {
  await clearSession();
  return NextResponse.json({ ok: true }, { headers: { location: request.nextUrl.origin } });
}
