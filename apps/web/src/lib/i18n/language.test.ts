import { describe, expect, it } from "vitest";

import { preferredLanguage } from "./language";

describe("preferredLanguage", () => {
  it.each([
    [null, "en"],
    ["", "en"],
    ["fr", "fr"],
    ["fr-CA,fr;q=0.9,en;q=0.8", "fr"],
    ["en-US,en;q=0.9,fr;q=0.8", "en"],
    ["en;q=0.5, fr;q=0.8", "fr"],
    ["FR-ca", "fr"],
    ["de-DE,es;q=0.9", "en"],
    ["de,fr;q=0.3", "fr"],
    ["fr;q=0, en;q=0.1", "en"],
    ["fr;q=abc", "en"],
    ["*", "en"],
  ])("%j -> %s", (header, expected) => {
    expect(preferredLanguage(header)).toBe(expected);
  });

  it("keeps the first of equally ranked languages", () => {
    expect(preferredLanguage("fr, en")).toBe("fr");
    expect(preferredLanguage("en, fr")).toBe("en");
  });
});
