import { getMessages } from "@tango/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetRequest } from "../../../../../../test/next";
import { fakeSupabase, formData } from "../../../../../../test/supabase";

vi.mock("next/headers", () => import("../../../../../../test/next").then((m) => m.nextHeaders));
vi.mock("@/lib/supabase/server", () =>
  import("../../../../../../test/next").then((m) => m.supabaseServer),
);

const { updateProfile } = await import("./actions");

const { auth } = getMessages("en");
const empty = {};

beforeEach(() => {
  resetRequest();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("updateProfile", () => {
  it("validates the name", async () => {
    expect(await updateProfile(empty, formData({ name: "  " }))).toEqual({
      fieldErrors: { name: auth.errors.nameLength },
      values: { name: "" },
    });
  });

  it("needs a session", async () => {
    expect(await updateProfile(empty, formData({ name: "Sam" }))).toEqual({
      formError: auth.errors.signedOut,
      values: { name: "Sam" },
    });
  });

  it("saves the trimmed name to the signed-in parent's profile", async () => {
    const supabase = fakeSupabase({ userId: "u1", tables: { profiles: [{}] } });
    resetRequest(supabase);
    expect(await updateProfile(empty, formData({ name: " Sam " }))).toEqual({
      notice: auth.profile.saved,
      values: { name: "Sam" },
    });
    expect(supabase.queries.profiles[0].calls).toEqual([
      ["update", [{ name: "Sam" }]],
      ["eq", ["id", "u1"]],
    ]);
  });

  it("reports a failed save", async () => {
    resetRequest(
      fakeSupabase({ userId: "u1", tables: { profiles: [{ error: { code: "500", message: "down" } }] } }),
    );
    expect(await updateProfile(empty, formData({ name: "Sam" }))).toEqual({
      formError: auth.errors.unexpected,
      values: { name: "Sam" },
    });
  });
});
