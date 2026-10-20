import "server-only";

import { createClient } from "@/lib/supabase/server";

// Holds the token from a co-parent invite link while a signed-out parent signs
// up or in, so the invite is accepted as soon as they are signed in. Following
// the link is the acceptance; there is no separate accept step.
export const INVITE_COOKIE = "tango_invite";

export const INVITE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  // Invites expire after 7 days; the database checks expiry on accept.
  maxAge: 60 * 60 * 24 * 7,
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isInviteToken(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

// Accepts the invite for the signed-in parent. Returns the database's error
// code (for example `email_mismatch`) or undefined on success. Unexpected
// failures are logged and reported as `unexpected`.
export async function acceptInviteToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  token: string,
): Promise<string | undefined> {
  const { error } = await supabase.rpc("accept_family_invite", { invite_token: token });
  if (!error) return undefined;
  if (error.code === "P0001") return error.message;
  console.error("[invite] accept failed", { code: error.code, message: error.message });
  return "unexpected";
}

// Where a parent lands after an accept attempt: the dashboard, with the error
// code in the URL for the welcome page to explain. Codes are fixed strings from
// the database, never user input.
export function dashboardAfterAccept(errorCode: string | undefined): string {
  return errorCode ? `/dashboard?invite=${encodeURIComponent(errorCode)}` : "/dashboard";
}
