import "server-only";

export interface IvaoConfig {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  apiKey: string | null;
}

/** Null when the app hasn't been given IVAO credentials — the UI degrades to
 *  public traffic only instead of erroring. */
export function getIvaoConfig(): IvaoConfig | null {
  const clientId = process.env.IVAO_CLIENT_ID;
  const clientSecret = process.env.IVAO_CLIENT_SECRET;
  const redirectUrl = process.env.IVAO_REDIRECT_URL;

  if (!clientId || !clientSecret || !redirectUrl) return null;

  return {
    clientId,
    clientSecret,
    redirectUrl,
    apiKey: process.env.IVAO_API_KEY || null,
  };
}

export const OIDC_DISCOVERY_URL =
  "https://api.ivao.aero/.well-known/openid-configuration";

export const WHAZZUP_URL = "https://api.ivao.aero/v2/tracker/whazzup";

/** IVAO publishes a new whazzup every 15s and asks clients not to poll faster. */
export const WHAZZUP_MIN_INTERVAL_MS = 15_000;

/** Scopes we actually use: identity only. Traffic comes from the public feed. */
export const OAUTH_SCOPES = ["openid", "profile", "email"];
