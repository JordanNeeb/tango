import { type NextRequest, NextResponse } from "next/server";

import { ACCOUNT_TYPE_COOKIE, isAccountType } from "@/lib/auth/validation";
import { restoreProfileLanguage } from "@/lib/i18n/server";
import {
  acceptInviteToken,
  dashboardAfterAccept,
  INVITE_COOKIE,
  isInviteToken,
} from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

// Google sends the parent back here with a one-time code (or an error, such as
// when they cancel). The destination is fixed, never taken from the URL.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const accountType = request.cookies.get(ACCOUNT_TYPE_COOKIE)?.value;
  const inviteToken = request.cookies.get(INVITE_COOKIE)?.value;
  let response = NextResponse.redirect(new URL("/sign-in?error=google-failed", request.url));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Only fills a type that is still unset, so an existing account keeps
      // its own. A failure is logged and sign-in still succeeds.
      if (isAccountType(accountType)) {
        const { error: typeError } = await supabase.rpc("set_account_type", {
          requested: accountType,
        });
        if (typeError) {
          console.error("[auth] set_account_type failed", { code: typeError.code });
        }
      }
      await restoreProfileLanguage(supabase, data.user.id);
      // A parent who came from a co-parent invite link accepts it now.
      const target = isInviteToken(inviteToken)
        ? dashboardAfterAccept(await acceptInviteToken(supabase, inviteToken))
        : "/dashboard";
      response = NextResponse.redirect(new URL(target, request.url));
      if (isInviteToken(inviteToken)) response.cookies.delete({ name: INVITE_COOKIE, path: "/" });
    } else {
      console.error("[auth] exchangeCodeForSession failed", { code: error.code });
    }
  }

  response.cookies.delete({ name: ACCOUNT_TYPE_COOKIE, path: "/auth/callback" });
  return response;
}
