import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { restoreProfileLanguage } from "@/lib/i18n/server";
import {
  acceptInviteToken,
  dashboardAfterAccept,
  INVITE_COOKIE,
  isInviteToken,
} from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

// Where each email link lands after it is verified. The destination is fixed
// per link type, never taken from the URL, so this can't be an open redirect.
const DESTINATIONS: Partial<Record<EmailOtpType, string>> = {
  email: "/dashboard",
  recovery: "/reset-password",
};

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const destination = type ? DESTINATIONS[type] : undefined;

  if (tokenHash && type && destination) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      if (data.user) await restoreProfileLanguage(supabase, data.user.id);
      // A parent who signed up from a co-parent invite link accepts it now.
      const inviteToken = request.cookies.get(INVITE_COOKIE)?.value;
      if (type === "email" && isInviteToken(inviteToken)) {
        const target = dashboardAfterAccept(await acceptInviteToken(supabase, inviteToken));
        const response = NextResponse.redirect(new URL(target, request.url));
        response.cookies.delete({ name: INVITE_COOKIE, path: "/" });
        return response;
      }
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return NextResponse.redirect(new URL("/sign-in?error=link-invalid", request.url));
}
