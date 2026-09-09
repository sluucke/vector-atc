import "server-only";
import { hkdf } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import { getIvaoConfig } from "./config";
import type { IvaoSession } from "./types";

const COOKIE = "ivao_session";
const PKCE_COOKIE = "ivao_pkce";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const hkdfAsync = promisify(hkdf);

/** The cookie key is derived from the client secret, so no extra env var is
 *  needed and rotating the secret invalidates old sessions. */
async function key(): Promise<Uint8Array> {
  const config = getIvaoConfig();
  if (!config) throw new Error("IVAO credentials are not configured");
  const bits = await hkdfAsync(
    "sha256",
    config.clientSecret,
    "vector-ivao-session",
    "cookie-encryption",
    32
  );
  return new Uint8Array(bits);
}

export async function writeSession(session: IvaoSession): Promise<void> {
  const jwt = await new EncryptJWT({ ...session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .encrypt(await key());

  (await cookies()).set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readSession(): Promise<IvaoSession | null> {
  if (!getIvaoConfig()) return null;

  const cookie = (await cookies()).get(COOKIE)?.value;
  if (!cookie) return null;

  try {
    const { payload } = await jwtDecrypt(cookie, await key());
    return payload as unknown as IvaoSession;
  } catch {
    // Tampered, expired, or encrypted under a rotated secret.
    return null;
  }
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function writePkceVerifier(verifier: string): Promise<void> {
  (await cookies()).set(PKCE_COOKIE, verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function takePkceVerifier(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(PKCE_COOKIE)?.value ?? null;
  if (value) store.delete(PKCE_COOKIE);
  return value;
}
