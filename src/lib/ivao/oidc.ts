import "server-only";
import { OIDC_DISCOVERY_URL } from "./config";

interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
}

let cached: { value: OidcDiscovery; fetchedAt: number } | null = null;
const DISCOVERY_TTL_MS = 60 * 60 * 1000;

/** Endpoints are discovered, never hard-coded — IVAO can move them. */
export async function discover(): Promise<OidcDiscovery> {
  if (cached && Date.now() - cached.fetchedAt < DISCOVERY_TTL_MS) {
    return cached.value;
  }

  const res = await fetch(OIDC_DISCOVERY_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`IVAO OpenID discovery failed: ${res.status}`);
  }

  const value = (await res.json()) as OidcDiscovery;
  cached = { value, fetchedAt: Date.now() };
  return value;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export async function exchangeCode(params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
}): Promise<TokenResponse> {
  const { token_endpoint } = await discover();

  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      // client_secret_basic is advertised first by IVAO's discovery document.
      authorization: `Basic ${Buffer.from(
        `${params.clientId}:${params.clientSecret}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUrl,
      code_verifier: params.codeVerifier,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `IVAO token exchange failed: ${res.status} ${await res.text()}`
    );
  }

  return (await res.json()) as TokenResponse;
}

export async function refreshTokens(params: {
  refreshToken: string;
  clientId: string;
  clientSecret: string;
}): Promise<TokenResponse> {
  const { token_endpoint } = await discover();

  const res = await fetch(token_endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${Buffer.from(
        `${params.clientId}:${params.clientSecret}`
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: params.refreshToken,
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`IVAO token refresh failed: ${res.status}`);
  return (await res.json()) as TokenResponse;
}

/**
 * IVAO's userinfo endpoint. The identity field name isn't pinned by the
 * discovery document, so accept the shapes OIDC and IVAO both use rather than
 * guessing one.
 */
export async function fetchUserInfo(accessToken: string): Promise<{
  vid: string;
  name: string | null;
  raw: Record<string, unknown>;
}> {
  const { userinfo_endpoint } = await discover();

  const res = await fetch(userinfo_endpoint, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`IVAO userinfo failed: ${res.status}`);
  }

  const raw = (await res.json()) as Record<string, unknown>;
  const candidate =
    raw.id ?? raw.vid ?? raw.sub ?? raw.userId ?? raw.publicNickname;
  if (candidate === undefined || candidate === null) {
    throw new Error(
      `IVAO userinfo did not include a recognisable VID (keys: ${Object.keys(
        raw
      ).join(", ")})`
    );
  }

  const first = typeof raw.firstName === "string" ? raw.firstName : null;
  const last = typeof raw.lastName === "string" ? raw.lastName : null;
  const name =
    [first, last].filter(Boolean).join(" ") ||
    (typeof raw.name === "string" ? raw.name : null);

  return { vid: String(candidate), name: name || null, raw };
}
