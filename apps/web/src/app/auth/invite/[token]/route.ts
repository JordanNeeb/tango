import { type NextRequest, NextResponse } from "next/server";

import {
  acceptInviteToken,
  dashboardAfterAccept,
  INVITE_COOKIE,
  INVITE_COOKIE_OPTIONS,
  isInviteToken,
} from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

// The link in a co-parent invite email. Following it is the acceptance:
// - signed in: accept now and go to the dashboard;
// - signed out: remember the invite and go to sign-up with the invited email
//   filled in (sign-up links to sign-in for an existing account). The invite is
//   accepted when they finish signing up or in.
export async function GET(request: NextRequest, context: RouteContext<"/auth/invite/[token]">) {
  const { token } = await context.params;
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  if (!isInviteToken(token)) return to("/sign-in?error=invite-unavailable");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (claims?.claims.sub) {
    return to(dashboardAfterAccept(await acceptInviteToken(supabase, token)));
  }

  const { data, error } = await supabase.rpc("get_family_invite", { invite_token: token });
  if (error) console.error("[invite] load failed", { code: error.code, message: error.message });
  const invite = data?.[0];
  if (!invite) return to("/sign-in?error=invite-unavailable");
  if (invite.expired) return to("/sign-in?error=invite-expired");

  const response = to(
    `/sign-up?${new URLSearchParams({ type: "parent", email: invite.invited_email })}`,
  );
  response.cookies.set(INVITE_COOKIE, token, INVITE_COOKIE_OPTIONS);
  return response;
}
