import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fakeSupabase } from "../../../../test/supabase";

import { loadFamilyId, loadWelcome } from "./families";

type Client = Parameters<typeof loadFamilyId>[0];
const client = (fake: ReturnType<typeof fakeSupabase>) => fake as unknown as Client;

const failure = { code: "500", message: "down" };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("loadFamilyId", () => {
  it("returns the parent's earliest-joined family", async () => {
    const supabase = fakeSupabase({ tables: { family_members: [{ data: [{ family_id: "f1" }] }] } });
    expect(await loadFamilyId(client(supabase), "u1")).toBe("f1");
    expect(supabase.queries.family_members[0].calls).toEqual([
      ["select", ["family_id"]],
      ["eq", ["user_id", "u1"]],
      ["order", ["joined_at", { ascending: true }]],
      ["order", ["family_id", { ascending: true }]],
      ["limit", [1]],
    ]);
  });

  it("returns null without a family", async () => {
    const supabase = fakeSupabase({ tables: { family_members: [{ data: [] }] } });
    expect(await loadFamilyId(client(supabase), "u1")).toBeNull();
  });

  it("returns error when the read fails", async () => {
    const supabase = fakeSupabase({ tables: { family_members: [{ error: failure }] } });
    expect(await loadFamilyId(client(supabase), "u1")).toBe("error");
  });
});

describe("loadWelcome", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the latest pending invite", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-24T12:00:00Z") });
    const supabase = fakeSupabase({
      tables: {
        family_invites: [
          {
            data: [
              {
                id: "i1",
                invited_email: "sam@example.ca",
                expires_at: "2026-10-30T12:00:00Z",
                time_zone: "America/Toronto",
              },
            ],
          },
        ],
      },
    });

    expect(await loadWelcome(client(supabase), "u1", true)).toEqual({
      hasName: true,
      sent: {
        id: "i1",
        email: "sam@example.ca",
        expiresAt: "2026-10-30T12:00:00Z",
        timeZone: "America/Toronto",
      },
    });
    const calls = supabase.queries.family_invites[0].calls;
    expect(calls).toContainEqual(["eq", ["invited_by", "u1"]]);
    expect(calls).toContainEqual(["eq", ["status", "pending"]]);
    expect(calls).toContainEqual(["gt", ["expires_at", "2026-10-24T12:00:00.000Z"]]);
  });

  it("returns no invite when none is pending", async () => {
    const supabase = fakeSupabase({ tables: { family_invites: [{ data: [] }] } });
    expect(await loadWelcome(client(supabase), "u1", false)).toEqual({ hasName: false, sent: null });
  });

  it("returns error when the read fails", async () => {
    const supabase = fakeSupabase({ tables: { family_invites: [{ error: failure }] } });
    expect(await loadWelcome(client(supabase), "u1", true)).toBe("error");
  });
});
