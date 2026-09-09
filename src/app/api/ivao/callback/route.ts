import { NextResponse, type NextRequest } from "next/server";
import { getIvaoConfig } from "@/lib/ivao/config";
import { exchangeCode, fetchUserInfo } from "@/lib/ivao/oidc";
import { takePkceVerifier, writeSession } from "@/lib/ivao/session";

export async function GET(request: NextRequest) {
  const config = getIvaoConfig();
  const home = new URL("/", request.nextUrl.origin);

  if (!config) {
    home.searchParams.set("ivao_error", "not_configured");
    return NextResponse.redirect(home);
  }

  const denied = request.nextUrl.searchParams.get("error");
  if (denied) {
    home.searchParams.set("ivao_error", denied);
    return NextResponse.redirect(home);
  }

  const code = request.nextUrl.searchParams.get("code");
  const verifier = await takePkceVerifier();
  if (!code || !verifier) {
    home.searchParams.set("ivao_error", "missing_code");
    return NextResponse.redirect(home);
  }

  try {
    const tokens = await exchangeCode({
      code,
      codeVerifier: verifier,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUrl: config.redirectUrl,
    });

    const user = await fetchUserInfo(tokens.access_token);

    await writeSession({
      vid: user.vid,
      name: user.name,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    });

    return NextResponse.redirect(home);
  } catch (error) {
    console.error("IVAO callback failed", error);
    home.searchParams.set("ivao_error", "exchange_failed");
    return NextResponse.redirect(home);
  }
}
