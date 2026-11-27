import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { CARD_KEY_PATTERN, readClassAccount } from "@/lib/classAccounts";
import { cardSecretMatches } from "@/lib/classAccounts.server";

/**
 * Signing in with a login card (20261112_class_accounts.sql).
 *
 * The browser sends the key from the card's QR code: the Clerk user id and a
 * long random secret. When the secret matches the hash in that user's private
 * metadata (which only our server can read or write) and the user is a class
 * account, Clerk gives a one-time sign-in ticket valid for 60 seconds. The
 * browser signs in with it, the same Clerk session as a password sign-in.
 *
 * Open to signed-out visitors (proxy.ts). Every failure gets the same answer,
 * so the endpoint tells nothing about which accounts exist.
 */

const WINDOW_MS = 60_000;
const MAX_TRIES = 10;
// Best effort per server instance: the secret is far too long to guess, this
// only keeps a script from hammering Clerk through us
const tries = new Map<string, { count: number; since: number }>();

const tooMany = (ip: string) => {
  const now = Date.now();
  const entry = tries.get(ip);
  if (!entry || now - entry.since > WINDOW_MS) {
    tries.set(ip, { count: 1, since: now });
    if (tries.size > 5000) tries.clear();
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_TRIES;
};

const refuse = (status = 400) => NextResponse.json({ ok: false }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooMany(ip)) return refuse(429);

  let key: unknown;
  try {
    key = ((await request.json()) as { key?: unknown })?.key;
  } catch {
    return refuse();
  }
  const match = typeof key === "string" ? CARD_KEY_PATTERN.exec(key) : null;
  if (!match) return refuse();
  const [, userId, secret] = match;

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    if (user.banned || user.locked || !readClassAccount(user.publicMetadata)) return refuse();
    if (!cardSecretMatches(secret, user.privateMetadata?.cardKeyHash)) return refuse();
    const { token } = await client.signInTokens.createSignInToken({ userId, expiresInSeconds: 60 });
    return NextResponse.json({ ok: true, ticket: token }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return refuse();
  }
}
