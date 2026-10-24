import { getMessages } from "@tango/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { expectRedirect, request, resetRequest } from "../../../../../../test/next";
import { fakeSupabase, formData } from "../../../../../../test/supabase";

vi.mock("next/headers", () => import("../../../../../../test/next").then((m) => m.nextHeaders));
vi.mock("next/navigation", () => import("../../../../../../test/next").then((m) => m.nextNavigation));
vi.mock("@/lib/supabase/server", () =>
  import("../../../../../../test/next").then((m) => m.supabaseServer),
);

const {
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  updatePassword,
} = await import("./actions");

const { auth } = getMessages("en");
const fr = getMessages("fr").auth;
const empty = {};
const TOKEN = "123e4567-e89b-12d3-a456-426614174000";
const authError = (code: string) => ({ code, message: code, name: "AuthApiError" });

// A server client with the auth methods these actions call.
function client(
  authMethods: Record<string, unknown>,
  options: Parameters<typeof fakeSupabase>[0] = {},
) {
  const supabase = fakeSupabase(options);
  Object.assign(supabase.auth, authMethods);
  resetRequest(supabase);
  return supabase;
}

let log: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetRequest();
  log = vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("signUp", () => {
  const valid = { type: "parent", name: " Sam ", email: " sam@example.ca ", password: "longenough" };

  it("rejects a missing account type", async () => {
    expect(await signUp(empty, formData({ ...valid, type: "admin" }))).toEqual({
      formError: auth.errors.unexpected,
    });
  });

  it("returns field errors and the values, never the password", async () => {
    const result = await signUp(empty, formData({ type: "parent", name: "", email: "x", password: "short" }));
    expect(result).toEqual({
      fieldErrors: {
        name: auth.errors.nameLength,
        email: auth.errors.emailInvalid,
        password: auth.errors.passwordLength,
      },
      values: { name: "", email: "x" },
    });
  });

  it("signs up with the name, language, and account type", async () => {
    const signUpFn = vi.fn(async () => ({ error: null }));
    client({ signUp: signUpFn });
    request.cookies.set("tango-lang", "fr");

    expect(await signUp(empty, formData(valid))).toEqual({ notice: fr.signUp.checkEmail });
    expect(signUpFn).toHaveBeenCalledWith({
      email: "sam@example.ca",
      password: "longenough",
      options: { data: { name: "Sam", language: "fr", account_type: "parent" } },
    });
  });

  it.each([
    ["weak_password", { fieldErrors: { password: auth.errors.passwordWeak } }],
    ["over_email_send_rate_limit", { formError: auth.errors.rateLimited }],
    ["over_request_rate_limit", { formError: auth.errors.rateLimited }],
    ["unexpected_failure", { formError: auth.errors.unexpected }],
  ])("maps %s", async (code, expected) => {
    client({ signUp: async () => ({ error: authError(code) }) });
    expect(await signUp(empty, formData(valid))).toEqual({
      ...expected,
      values: { name: "Sam", email: "sam@example.ca" },
    });
  });
});

describe("signIn", () => {
  const valid = { email: "sam@example.ca", password: "secret" };

  it("requires an email and a password", async () => {
    expect(await signIn(empty, formData({ email: "", password: "" }))).toEqual({
      fieldErrors: { email: auth.errors.emailRequired, password: auth.errors.passwordRequired },
      values: { email: "" },
    });
  });

  it.each([
    ["invalid_credentials", { formError: auth.errors.invalidCredentials }],
    ["email_not_confirmed", { formError: auth.errors.emailNotConfirmed, unconfirmed: true }],
    ["over_request_rate_limit", { formError: auth.errors.rateLimited }],
    ["unexpected_failure", { formError: auth.errors.unexpected }],
  ])("maps %s", async (code, expected) => {
    client({ signInWithPassword: async () => ({ data: {}, error: authError(code) }) });
    expect(await signIn(empty, formData(valid))).toEqual({
      ...expected,
      values: { email: "sam@example.ca" },
    });
  });

  it("restores the saved language and goes to the dashboard", async () => {
    client(
      { signInWithPassword: async () => ({ data: { user: { id: "u1" } }, error: null }) },
      { tables: { profiles: [{ data: { language: "fr" } }] } },
    );
    await expectRedirect(signIn(empty, formData(valid)), "/dashboard");
    expect(request.cookies.get("tango-lang")).toBe("fr");
  });

  it("accepts a pending invite after signing in", async () => {
    const supabase = client(
      { signInWithPassword: async () => ({ data: { user: { id: "u1" } }, error: null }) },
      {
        tables: { profiles: [{ data: { language: "en" } }] },
        rpcs: { accept_family_invite: { error: { code: "P0001", message: "email_mismatch" } } },
      },
    );
    request.cookies.set("tango_invite", TOKEN);

    await expectRedirect(signIn(empty, formData(valid)), "/dashboard?invite=email_mismatch");
    expect(supabase.rpc).toHaveBeenCalledWith("accept_family_invite", { invite_token: TOKEN });
    expect(request.cookies.has("tango_invite")).toBe(false);
  });

  it("ignores a malformed invite cookie", async () => {
    const supabase = client(
      { signInWithPassword: async () => ({ data: { user: { id: "u1" } }, error: null }) },
      { tables: { profiles: [{ data: { language: "en" } }] } },
    );
    request.cookies.set("tango_invite", "not-a-token");
    await expectRedirect(signIn(empty, formData(valid)), "/dashboard");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("still signs in when the language can't be read", async () => {
    client(
      { signInWithPassword: async () => ({ data: { user: { id: "u1" } }, error: null }) },
      { tables: { profiles: [{ error: { code: "500", message: "down" } }] } },
    );
    await expectRedirect(signIn(empty, formData(valid)), "/dashboard");
    expect(log).toHaveBeenCalled();
  });
});

describe("signInWithGoogle", () => {
  it("fails without an origin", async () => {
    expect(await signInWithGoogle(empty, formData({}))).toEqual({ formError: auth.errors.googleFailed });
  });

  it("keeps the account type for the callback and goes to Google", async () => {
    const signInWithOAuth = vi.fn(async () => ({ data: { url: "https://accounts.google.com/x" }, error: null }));
    client({ signInWithOAuth });
    request.headers.set("origin", "http://localhost:3000");

    await expectRedirect(
      signInWithGoogle(empty, formData({ type: "professional" })),
      "https://accounts.google.com/x",
    );
    expect(request.cookies.get("tango_account_type")).toBe("professional");
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback" },
    });
  });

  it("ignores an invalid account type", async () => {
    client({ signInWithOAuth: async () => ({ data: { url: "https://g" }, error: null }) });
    request.headers.set("origin", "http://localhost:3000");
    await expectRedirect(signInWithGoogle(empty, formData({ type: "admin" })), "https://g");
    expect(request.cookies.has("tango_account_type")).toBe(false);
  });

  it("fails when Supabase returns an error or no URL", async () => {
    client({ signInWithOAuth: async () => ({ data: { url: null }, error: authError("x") }) });
    request.headers.set("origin", "http://localhost:3000");
    expect(await signInWithGoogle(empty, formData({}))).toEqual({ formError: auth.errors.googleFailed });

    client({ signInWithOAuth: async () => ({ data: { url: null }, error: null }) });
    request.headers.set("origin", "http://localhost:3000");
    expect(await signInWithGoogle(empty, formData({}))).toEqual({ formError: auth.errors.googleFailed });
  });
});

describe("resendConfirmation", () => {
  it("validates the email", async () => {
    expect(await resendConfirmation(empty, formData({ email: "" }))).toEqual({
      fieldErrors: { email: auth.errors.emailRequired },
    });
  });

  it("resends the sign-up email", async () => {
    const resend = vi.fn(async () => ({ error: null }));
    client({ resend });
    expect(await resendConfirmation(empty, formData({ email: "sam@example.ca" }))).toEqual({
      notice: auth.notices.confirmationSent,
    });
    expect(resend).toHaveBeenCalledWith({ type: "signup", email: "sam@example.ca" });
  });

  it.each([
    ["over_email_send_rate_limit", auth.errors.rateLimited],
    ["other", auth.errors.unexpected],
  ])("maps %s and keeps the resend offer", async (code, formError) => {
    client({ resend: async () => ({ error: authError(code) }) });
    expect(await resendConfirmation(empty, formData({ email: "sam@example.ca" }))).toEqual({
      formError,
      unconfirmed: true,
    });
  });
});

describe("requestPasswordReset", () => {
  it("validates the email", async () => {
    expect(await requestPasswordReset(empty, formData({ email: "bad" }))).toEqual({
      fieldErrors: { email: auth.errors.emailInvalid },
      values: { email: "bad" },
    });
  });

  it("sends the same notice whether or not the account exists", async () => {
    const resetPasswordForEmail = vi.fn(async () => ({ error: null }));
    client({ resetPasswordForEmail });
    expect(await requestPasswordReset(empty, formData({ email: "sam@example.ca" }))).toEqual({
      notice: auth.forgotPassword.sent,
    });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("sam@example.ca");
  });

  it.each([
    ["over_email_send_rate_limit", auth.errors.rateLimited],
    ["other", auth.errors.unexpected],
  ])("maps %s", async (code, formError) => {
    client({ resetPasswordForEmail: async () => ({ error: authError(code) }) });
    expect(await requestPasswordReset(empty, formData({ email: "sam@example.ca" }))).toEqual({
      formError,
      values: { email: "sam@example.ca" },
    });
  });
});

describe("updatePassword", () => {
  const valid = formData({ password: "newpassword" });

  it("validates the length", async () => {
    expect(await updatePassword(empty, formData({ password: "short" }))).toEqual({
      fieldErrors: { password: auth.errors.passwordLength },
    });
  });

  it("needs a session", async () => {
    client({});
    expect(await updatePassword(empty, valid)).toEqual({ formError: auth.errors.sessionExpired });
  });

  it.each([
    ["weak_password", { fieldErrors: { password: auth.errors.passwordWeak } }],
    ["same_password", { fieldErrors: { password: auth.errors.passwordSame } }],
    ["other", { formError: auth.errors.unexpected }],
  ])("maps %s", async (code, expected) => {
    client({ updateUser: async () => ({ error: authError(code) }) }, { userId: "u1" });
    expect(await updatePassword(empty, valid)).toEqual(expected);
  });

  it("signs out and returns to sign-in, even if sign-out fails", async () => {
    const updateUser = vi.fn(async () => ({ error: null }));
    client({ updateUser, signOut: async () => ({ error: authError("x") }) }, { userId: "u1" });
    await expectRedirect(updatePassword(empty, valid), "/sign-in?notice=password-updated");
    expect(updateUser).toHaveBeenCalledWith({ password: "newpassword" });
    expect(log).toHaveBeenCalled();
  });
});

describe("signOut", () => {
  it("signs out and returns to sign-in", async () => {
    const signOutFn = vi.fn(async () => ({ error: null }));
    client({ signOut: signOutFn });
    await expectRedirect(signOut(), "/sign-in");
    expect(signOutFn).toHaveBeenCalled();
  });
});
