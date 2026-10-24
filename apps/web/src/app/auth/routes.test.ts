import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { request, resetRequest } from "../../../../../test/next";
import { fakeSupabase } from "../../../../../test/supabase";

vi.mock("next/headers", () => import("../../../../../test/next").then((m) => m.nextHeaders));
vi.mock("@/lib/supabase/server", () =>
  import("../../../../../test/next").then((m) => m.supabaseServer),
);

const callback = await import("./callback/route");
const confirm = await import("./confirm/route");
const invite = await import("./invite/[token]/route");

const TOKEN = "123e4567-e89b-12d3-a456-426614174000";
const PROFILE = { profiles: [{ data: { language: "en" } }] };

function get(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  return new NextRequest(`http://localhost:3000${path}`, { headers: { cookie } });
}

const location = (response: Response) => response.headers.get("location");

// A cookie the response clears: set to empty with an expiry in the past.
const cleared = (response: Response, name: string) =>
  response.headers.getSetCookie().some((c) => c.startsWith(`${name}=;`) && c.includes("Expires=Thu, 01 Jan 1970"));

function client(
  authMethods: Record<string, unknown>,
  options: Parameters<typeof fakeSupabase>[0] = {},
) {
  const supabase = fakeSupabase(options);
  Object.assign(supabase.auth, authMethods);
  resetRequest(supabase);
  return supabase;
}

beforeEach(() => {
  resetRequest();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /auth/callback", () => {
  const exchanged = { exchangeCodeForSession: async () => ({ data: { user: { id: "u1" } }, error: null }) };

  it("returns to sign-in without a code", async () => {
    const response = await callback.GET(get("/auth/callback?error=access_denied"));
    expect(location(response)).toBe("http://localhost:3000/sign-in?error=google-failed");
    expect(cleared(response, "tango_account_type")).toBe(true);
  });

  it("returns to sign-in when the code exchange fails", async () => {
    client({ exchangeCodeForSession: async () => ({ data: {}, error: { code: "bad_code" } }) });
    const response = await callback.GET(get("/auth/callback?code=x"));
    expect(location(response)).toBe("http://localhost:3000/sign-in?error=google-failed");
  });

  it("saves the chosen account type and goes to the dashboard", async () => {
    const supabase = client(exchanged, { tables: PROFILE, rpcs: { set_account_type: {} } });
    const response = await callback.GET(get("/auth/callback?code=x", { tango_account_type: "parent" }));
    expect(location(response)).toBe("http://localhost:3000/dashboard");
    expect(supabase.rpc).toHaveBeenCalledWith("set_account_type", { requested: "parent" });
    expect(cleared(response, "tango_account_type")).toBe(true);
  });

  it("still signs in when the account type can't be saved", async () => {
    client(exchanged, { tables: PROFILE, rpcs: { set_account_type: { error: { code: "x", message: "x" } } } });
    const response = await callback.GET(get("/auth/callback?code=x", { tango_account_type: "parent" }));
    expect(location(response)).toBe("http://localhost:3000/dashboard");
  });

  it("ignores an invalid account type", async () => {
    const supabase = client(exchanged, { tables: PROFILE });
    await callback.GET(get("/auth/callback?code=x", { tango_account_type: "admin" }));
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("accepts a pending invite", async () => {
    client(exchanged, { tables: PROFILE, rpcs: { accept_family_invite: {} } });
    const response = await callback.GET(get("/auth/callback?code=x", { tango_invite: TOKEN }));
    expect(location(response)).toBe("http://localhost:3000/dashboard");
    expect(cleared(response, "tango_invite")).toBe(true);
  });

  it("restores the profile language", async () => {
    client(exchanged, { tables: { profiles: [{ data: { language: "fr" } }] } });
    await callback.GET(get("/auth/callback?code=x"));
    expect(request.cookies.get("tango-lang")).toBe("fr");
  });
});

describe("GET /auth/confirm", () => {
  const verified = (verifyOtp = vi.fn(async () => ({ data: { user: { id: "u1" } }, error: null }))) => ({ verifyOtp });

  it.each([
    ["no token", "/auth/confirm?type=email"],
    ["no type", "/auth/confirm?token_hash=h"],
    ["an unsupported type", "/auth/confirm?token_hash=h&type=magiclink"],
  ])("rejects a link with %s", async (_name, path) => {
    const response = await confirm.GET(get(path));
    expect(location(response)).toBe("http://localhost:3000/sign-in?error=link-invalid");
  });

  it("rejects a link that fails verification", async () => {
    client({ verifyOtp: async () => ({ data: {}, error: { code: "otp_expired" } }) });
    const response = await confirm.GET(get("/auth/confirm?token_hash=h&type=email"));
    expect(location(response)).toBe("http://localhost:3000/sign-in?error=link-invalid");
  });

  it.each([
    ["email", "/dashboard"],
    ["recovery", "/reset-password"],
  ])("sends a verified %s link to %s", async (type, target) => {
    const methods = verified();
    client(methods, { tables: PROFILE });
    const response = await confirm.GET(get(`/auth/confirm?token_hash=h&type=${type}&next=https://evil.example`));
    expect(location(response)).toBe(`http://localhost:3000${target}`);
    expect(methods.verifyOtp).toHaveBeenCalledWith({ token_hash: "h", type });
  });

  it("accepts a pending invite after confirming the email", async () => {
    client(verified(), {
      tables: PROFILE,
      rpcs: { accept_family_invite: { error: { code: "P0001", message: "invite_unavailable" } } },
    });
    const response = await confirm.GET(get("/auth/confirm?token_hash=h&type=email", { tango_invite: TOKEN }));
    expect(location(response)).toBe("http://localhost:3000/dashboard?invite=invite_unavailable");
    expect(cleared(response, "tango_invite")).toBe(true);
  });

  it("leaves the invite for a password reset", async () => {
    const supabase = client(verified(), { tables: PROFILE });
    const response = await confirm.GET(get("/auth/confirm?token_hash=h&type=recovery", { tango_invite: TOKEN }));
    expect(location(response)).toBe("http://localhost:3000/reset-password");
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe("GET /auth/invite/[token]", () => {
  const open = (token: string) =>
    invite.GET(get(`/auth/invite/${token}`), { params: Promise.resolve({ token }) });

  it("rejects a malformed token", async () => {
    const response = await open("nope");
    expect(location(response)).toBe("http://localhost:3000/sign-in?error=invite-unavailable");
  });

  it("accepts right away for a signed-in parent", async () => {
    const supabase = client({}, { userId: "u1", rpcs: { accept_family_invite: {} } });
    const response = await open(TOKEN);
    expect(location(response)).toBe("http://localhost:3000/dashboard");
    expect(supabase.rpc).toHaveBeenCalledWith("accept_family_invite", { invite_token: TOKEN });
  });

  it("remembers the invite and opens sign-up with the email for a signed-out parent", async () => {
    client({}, { rpcs: { get_family_invite: { data: [{ invited_email: "sam+kids@example.ca", expired: false }] } } });
    const response = await open(TOKEN);
    expect(location(response)).toBe(
      "http://localhost:3000/sign-up?type=parent&email=sam%2Bkids%40example.ca",
    );
    expect(response.cookies.get("tango_invite")).toMatchObject({ value: TOKEN, httpOnly: true, path: "/" });
  });

  it.each([
    ["a missing invite", { data: [] }, "invite-unavailable"],
    ["a failed lookup", { error: { code: "500", message: "down" } }, "invite-unavailable"],
    ["an expired invite", { data: [{ invited_email: "sam@example.ca", expired: true }] }, "invite-expired"],
  ])("explains %s", async (_name, result, error) => {
    client({}, { rpcs: { get_family_invite: result } });
    const response = await open(TOKEN);
    expect(location(response)).toBe(`http://localhost:3000/sign-in?error=${error}`);
    expect(response.cookies.get("tango_invite")).toBeUndefined();
  });
});
