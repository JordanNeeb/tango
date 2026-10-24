import { getMessages } from "@tango/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { expectRedirect, request, resetRequest } from "../../../../../test/next";
import { fakeSupabase, formData } from "../../../../../test/supabase";

vi.mock("next/headers", () => import("../../../../../test/next").then((m) => m.nextHeaders));
vi.mock("next/navigation", () => import("../../../../../test/next").then((m) => m.nextNavigation));
vi.mock("@/lib/supabase/server", () =>
  import("../../../../../test/next").then((m) => m.supabaseServer),
);

const { setLanguage } = await import("./actions");

const { auth } = getMessages("en");

beforeEach(() => {
  resetRequest();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("setLanguage", () => {
  it("rejects an unsupported language", async () => {
    expect(await setLanguage({}, formData({ lang: "de" }))).toEqual({
      formError: auth.errors.unexpected,
    });
    expect(request.cookies.has("tango-lang")).toBe(false);
  });

  it("sets a visitor's cookie and returns to the same page", async () => {
    request.headers.set("referer", "http://localhost:3000/pricing?x=1");
    await expectRedirect(setLanguage({}, formData({ lang: "fr" })), "/pricing");
    expect(request.cookies.get("tango-lang")).toBe("fr");
  });

  it("saves a signed-in parent's choice to their profile first", async () => {
    const supabase = fakeSupabase({ userId: "u1", tables: { profiles: [{}] } });
    resetRequest(supabase);
    await expectRedirect(setLanguage({}, formData({ lang: "fr" })), "/");
    expect(supabase.queries.profiles[0].calls).toEqual([
      ["update", [{ language: "fr" }]],
      ["eq", ["id", "u1"]],
    ]);
    expect(request.cookies.get("tango-lang")).toBe("fr");
  });

  it("changes nothing when the profile can't be saved", async () => {
    resetRequest(
      fakeSupabase({ userId: "u1", tables: { profiles: [{ error: { code: "500", message: "down" } }] } }),
    );
    expect(await setLanguage({}, formData({ lang: "fr" }))).toEqual({
      formError: auth.errors.unexpected,
    });
    expect(request.cookies.has("tango-lang")).toBe(false);
  });

  it.each([
    ["no referer", undefined, "/"],
    ["a malformed referer", "not a url", "/"],
    ["another site's referer", "https://evil.example/dashboard", "/dashboard"],
    ["a protocol-relative path", "http://localhost:3000//evil.example", "/"],
  ])("stays on this site with %s", async (_name, referer, target) => {
    if (referer) request.headers.set("referer", referer);
    await expectRedirect(setLanguage({}, formData({ lang: "en" })), target);
  });
});
