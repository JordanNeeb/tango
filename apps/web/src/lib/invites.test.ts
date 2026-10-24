import { describe, expect, it, vi } from "vitest";

import { fakeSupabase } from "../../../../test/supabase";

import { acceptInviteToken, dashboardAfterAccept, isInviteToken } from "./invites";

type Client = Parameters<typeof acceptInviteToken>[0];

const TOKEN = "123e4567-e89b-12d3-a456-426614174000";

describe("isInviteToken", () => {
  it("accepts a uuid string only", () => {
    expect(isInviteToken(TOKEN)).toBe(true);
    expect(isInviteToken(TOKEN.toUpperCase())).toBe(true);
    expect(isInviteToken(`${TOKEN}x`)).toBe(false);
    expect(isInviteToken("")).toBe(false);
    expect(isInviteToken(undefined)).toBe(false);
    expect(isInviteToken(123)).toBe(false);
  });
});

describe("dashboardAfterAccept", () => {
  it("goes to the dashboard, with any error code in the URL", () => {
    expect(dashboardAfterAccept(undefined)).toBe("/dashboard");
    expect(dashboardAfterAccept("email_mismatch")).toBe("/dashboard?invite=email_mismatch");
    expect(dashboardAfterAccept("a b&c")).toBe("/dashboard?invite=a%20b%26c");
  });
});

describe("acceptInviteToken", () => {
  it("returns undefined on success", async () => {
    const supabase = fakeSupabase({ rpcs: { accept_family_invite: {} } });
    expect(await acceptInviteToken(supabase as unknown as Client, TOKEN)).toBeUndefined();
    expect(supabase.rpc).toHaveBeenCalledWith("accept_family_invite", { invite_token: TOKEN });
  });

  it("returns the database's raised code", async () => {
    const supabase = fakeSupabase({
      rpcs: { accept_family_invite: { error: { code: "P0001", message: "email_mismatch" } } },
    });
    expect(await acceptInviteToken(supabase as unknown as Client, TOKEN)).toBe("email_mismatch");
  });

  it("logs other failures and reports them as unexpected", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const supabase = fakeSupabase({
      rpcs: { accept_family_invite: { error: { code: "08006", message: "connection lost" } } },
    });
    expect(await acceptInviteToken(supabase as unknown as Client, TOKEN)).toBe("unexpected");
    expect(log).toHaveBeenCalledOnce();
  });
});
