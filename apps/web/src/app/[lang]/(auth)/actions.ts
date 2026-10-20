"use server";

import { type AuthError } from "@supabase/supabase-js";
import { type Messages } from "@tango/shared";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  ACCOUNT_TYPE_COOKIE,
  type ActionResult,
  type FieldErrors,
  hasErrors,
  isAccountType,
  readText,
  validateEmail,
  validateName,
  validateNewPassword,
} from "@/lib/auth/validation";
import {
  requestLanguage,
  requestMessages,
  restoreProfileLanguage,
} from "@/lib/i18n/server";
import {
  acceptInviteToken,
  dashboardAfterAccept,
  INVITE_COOKIE,
  isInviteToken,
} from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

const RATE_LIMIT_CODES = new Set([
  "over_request_rate_limit",
  "over_email_send_rate_limit",
]);

// Maps Supabase errors we expect to friendly messages; anything else is logged
// and shown as a generic failure. Raw Supabase messages never reach the UI.
function unexpected(
  action: string,
  error: AuthError | Error,
  errors: Messages["auth"]["errors"],
): ActionResult {
  const code = "code" in error ? error.code : undefined;
  console.error(`[auth] ${action} failed`, { code, message: error.message });
  return { formError: errors.unexpected };
}

export async function signUp(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { auth } = await requestMessages();
  const accountType = formData.get("type");
  if (!isAccountType(accountType)) {
    console.error("[auth] signUp without a valid account type");
    return { formError: auth.errors.unexpected };
  }
  const { name, error: nameError } = validateName(
    readText(formData, "name"),
    auth.errors.nameLength,
  );
  const { email, error: emailError } = validateEmail(readText(formData, "email"), auth.errors);
  const password = readText(formData, "password");
  const fieldErrors: FieldErrors = {
    name: nameError,
    email: emailError,
    password: validateNewPassword(password, auth.errors),
  };
  const values = { name, email };
  if (hasErrors(fieldErrors)) return { fieldErrors, values };

  const supabase = await createClient();
  // The sign-up trigger copies the name, language, and account type into the
  // new profile.
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, language: await requestLanguage(), account_type: accountType },
    },
  });

  if (error) {
    if (error.code === "weak_password") {
      return { fieldErrors: { password: auth.errors.passwordWeak }, values };
    }
    if (error.code && RATE_LIMIT_CODES.has(error.code)) {
      return { formError: auth.errors.rateLimited, values };
    }
    return { ...unexpected("signUp", error, auth.errors), values };
  }

  // Supabase answers the same way for an email that is already registered, so
  // this notice never reveals whether an account exists.
  return { notice: auth.signUp.checkEmail };
}

export async function signIn(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { auth } = await requestMessages();
  const { email, error: emailError } = validateEmail(readText(formData, "email"), auth.errors);
  const password = readText(formData, "password");
  const fieldErrors: FieldErrors = {
    email: emailError,
    password: password ? undefined : auth.errors.passwordRequired,
  };
  const values = { email };
  if (hasErrors(fieldErrors)) return { fieldErrors, values };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "invalid_credentials") {
      return { formError: auth.errors.invalidCredentials, values };
    }
    if (error.code === "email_not_confirmed") {
      return {
        formError: auth.errors.emailNotConfirmed,
        unconfirmed: true,
        values,
      };
    }
    if (error.code && RATE_LIMIT_CODES.has(error.code)) {
      return { formError: auth.errors.rateLimited, values };
    }
    return { ...unexpected("signIn", error, auth.errors), values };
  }

  await restoreProfileLanguage(supabase, data.user.id);

  // A parent who came from a co-parent invite link accepts it now.
  const cookieStore = await cookies();
  const inviteToken = cookieStore.get(INVITE_COOKIE)?.value;
  if (isInviteToken(inviteToken)) {
    const errorCode = await acceptInviteToken(supabase, inviteToken);
    cookieStore.delete({ name: INVITE_COOKIE, path: "/" });
    redirect(dashboardAfterAccept(errorCode));
  }
  redirect("/dashboard");
}

// Starts Google's OAuth flow (PKCE; the code verifier is stored in a cookie).
// Google returns to /auth/callback on this origin; Supabase's redirect
// allow-list still applies, and nothing from the form shapes the URL. From the
// sign-up page the form also carries the account type, kept in a cookie for
// the callback.
export async function signInWithGoogle(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { auth } = await requestMessages();
  const origin = (await headers()).get("origin");
  if (!origin) return { formError: auth.errors.googleFailed };

  const accountType = formData.get("type");
  if (isAccountType(accountType)) {
    (await cookies()).set(ACCOUNT_TYPE_COOKIE, accountType, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/auth/callback",
      maxAge: 600,
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });

  if (error || !data.url) {
    if (error) unexpected("signInWithGoogle", error, auth.errors);
    return { formError: auth.errors.googleFailed };
  }

  redirect(data.url);
}

export async function resendConfirmation(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { auth } = await requestMessages();
  const { email, error: emailError } = validateEmail(readText(formData, "email"), auth.errors);
  if (emailError) return { fieldErrors: { email: emailError } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) {
    if (error.code && RATE_LIMIT_CODES.has(error.code)) {
      return { formError: auth.errors.rateLimited, unconfirmed: true };
    }
    return { ...unexpected("resendConfirmation", error, auth.errors), unconfirmed: true };
  }

  return { notice: auth.notices.confirmationSent };
}

export async function requestPasswordReset(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { auth } = await requestMessages();
  const { email, error: emailError } = validateEmail(readText(formData, "email"), auth.errors);
  const values = { email };
  if (emailError) return { fieldErrors: { email: emailError }, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    if (error.code && RATE_LIMIT_CODES.has(error.code)) {
      return { formError: auth.errors.rateLimited, values };
    }
    return { ...unexpected("requestPasswordReset", error, auth.errors), values };
  }

  // Same notice whether or not the account exists.
  return { notice: auth.forgotPassword.sent };
}

export async function updatePassword(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { auth } = await requestMessages();
  const password = readText(formData, "password");
  const passwordError = validateNewPassword(password, auth.errors);
  if (passwordError) return { fieldErrors: { password: passwordError } };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) return { formError: auth.errors.sessionExpired };

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (error.code === "weak_password") {
      return { fieldErrors: { password: auth.errors.passwordWeak } };
    }
    if (error.code === "same_password") {
      return { fieldErrors: { password: auth.errors.passwordSame } };
    }
    return unexpected("updatePassword", error, auth.errors);
  }

  // The parent signs in again with the new password. A failed sign-out is
  // logged but doesn't block: the password has already changed, and the proxy
  // sends a still-signed-in parent from /sign-in on to /dashboard.
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) unexpected("updatePassword signOut", signOutError, auth.errors);
  redirect("/sign-in?notice=password-updated");
}

export async function signOut(): Promise<void> {
  const { auth } = await requestMessages();
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) unexpected("signOut", error, auth.errors);
  redirect("/sign-in");
}
