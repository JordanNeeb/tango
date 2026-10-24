import { getMessages } from "@tango/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { request, resetRequest } from "../../../../../test/next";
import { fakeSupabase } from "../../../../../test/supabase";

vi.mock("next/headers", () => import("../../../../../test/next").then((m) => m.nextHeaders));
vi.mock("next/navigation", () => import("../../../../../test/next").then((m) => m.nextNavigation));

const { pageLanguage, pageMessages, requestLanguage, requestMessages, restoreProfileLanguage } =
  await import("./server");

type Client = Parameters<typeof restoreProfileLanguage>[0];

beforeEach(() => {
  resetRequest();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("pageLanguage", () => {
  it("returns the page's language", async () => {
    expect(await pageLanguage(Promise.resolve({ lang: "fr" }))).toBe("fr");
    expect(await pageMessages(Promise.resolve({ lang: "en" }))).toBe(getMessages("en"));
  });

  it("is not found for any other segment", async () => {
    await expect(pageLanguage(Promise.resolve({ lang: "de" }))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("requestLanguage", () => {
  it("reads the language cookie", async () => {
    request.cookies.set("tango-lang", "fr");
    expect(await requestLanguage()).toBe("fr");
    expect(await requestMessages()).toBe(getMessages("fr"));
  });

  it("falls back to English for a missing or unknown cookie", async () => {
    expect(await requestLanguage()).toBe("en");
    request.cookies.set("tango-lang", "de");
    expect(await requestLanguage()).toBe("en");
  });
});

describe("restoreProfileLanguage", () => {
  it("sets the cookie to the profile's language", async () => {
    const supabase = fakeSupabase({ tables: { profiles: [{ data: { language: "fr" } }] } });
    await restoreProfileLanguage(supabase as unknown as Client, "u1");
    expect(request.cookies.get("tango-lang")).toBe("fr");
    expect(supabase.queries.profiles[0].calls).toContainEqual(["eq", ["id", "u1"]]);
  });

  it.each([
    ["a failed read", { error: { code: "500", message: "down" } }],
    ["an unknown language", { data: { language: "de" } }],
  ])("keeps the current language after %s", async (_name, result) => {
    const supabase = fakeSupabase({ tables: { profiles: [result] } });
    await restoreProfileLanguage(supabase as unknown as Client, "u1");
    expect(request.cookies.has("tango-lang")).toBe(false);
  });
});
