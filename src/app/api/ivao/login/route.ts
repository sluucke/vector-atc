import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getIvaoConfig, OAUTH_SCOPES } from "@/lib/ivao/config";
import { discover } from "@/lib/ivao/oidc";
import { writePkceVerifier } from "@/lib/ivao/session";

const base64url = (buffer: Buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

export async function GET() {
  const config = getIvaoConfig();
  if (!config) {
    return NextResponse.json(
      { error: "IVAO credentials are not configured on this deployment." },
      { status: 503 }
    );
  }

  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  await writePkceVerifier(verifier);

  const { authorization_endpoint } = await discover();
  const url = new URL(authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUrl);
  url.searchParams.set("scope", OAUTH_SCOPES.join(" "));
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  return NextResponse.redirect(url);
}
