import { createServerClient } from "@supabase/ssr";
import { isLanguage } from "@tango/shared";
import { type NextRequest, NextResponse } from "next/server";

import { isAccountType } from "@/lib/auth/validation";
import {
  LANGUAGE_COOKIE,
  LANGUAGE_COOKIE_OPTIONS,
  preferredLanguage,
} from "@/lib/i18n/language";

// Signed-out visitors to these pages go to the paired page.
const SIGNED_IN_ONLY: Record<string, string> = {
  "/dashboard": "/sign-in",
  "/profile": "/sign-in",
  "/messages": "/sign-in",
  "/reset-password": "/forgot-password",
};
// Signed-in visitors to these pages go to their dashboard.
const SIGNED_OUT_ONLY = ["/", "/get-started", "/sign-in", "/sign-up"];

// Route handlers that live outside `app/[lang]`.
const UNLOCALIZED_PREFIX = "/auth/";

// Refreshes the Supabase session cookie on every page request and routes
// visitors by session state. Pages still verify the session themselves; this
// check is only optimistic. Pages are then rewritten to `/<lang><path>`, so the
// language never shows in the URL.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieLang = request.cookies.get(LANGUAGE_COOKIE)?.value;
  const lang = isLanguage(cookieLang)
    ? cookieLang
    : preferredLanguage(request.headers.get("accept-language"));
  // Server Actions read the language from the cookie, so it is set on this
  // request before anything else sees it.
  if (cookieLang !== lang) request.cookies.set(LANGUAGE_COOKIE, lang);

  const localizedUrl = request.nextUrl.clone();
  localizedUrl.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  const next = () =>
    pathname.startsWith(UNLOCALIZED_PREFIX)
      ? NextResponse.next({ request })
      : NextResponse.rewrite(localizedUrl, { request });

  let response = next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = next();
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims.sub);

  const target = signedIn
    ? SIGNED_OUT_ONLY.includes(pathname)
      ? "/dashboard"
      : undefined
    : (SIGNED_IN_ONLY[pathname] ??
      (pathname.startsWith("/messages/") ? "/sign-in" : undefined) ??
      signUpWithoutType(request));

  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    response = NextResponse.redirect(url);
  }

  if (cookieLang !== lang) response.cookies.set(LANGUAGE_COOKIE, lang, LANGUAGE_COOKIE_OPTIONS);
  return response;
}

// Sign-up needs the account type chosen on /get-started.
function signUpWithoutType(request: NextRequest): string | undefined {
  const { pathname, searchParams } = request.nextUrl;
  return pathname === "/sign-up" && !isAccountType(searchParams.get("type"))
    ? "/get-started"
    : undefined;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
