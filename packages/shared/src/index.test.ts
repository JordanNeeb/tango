import { describe, expect, it } from "vitest";

import { getMessages, isLanguage, SUPPORTED_LANGUAGES } from "./index";

// Every leaf string with its dotted path, for comparing the two languages.
function leaves(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leaves(child, path ? `${path}.${key}` : key),
  );
}

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe("isLanguage", () => {
  it("accepts the supported languages", () => {
    for (const lang of SUPPORTED_LANGUAGES) expect(isLanguage(lang)).toBe(true);
  });

  it.each(["EN", "fr-CA", "es", "", null, undefined, 1, {}])("rejects %j", (value) => {
    expect(isLanguage(value)).toBe(false);
  });
});

describe("messages", () => {
  const en = new Map(leaves(getMessages("en")));
  const fr = new Map(leaves(getMessages("fr")));

  it("has the same keys in English and French", () => {
    expect([...fr.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it("has no empty strings", () => {
    for (const [path, text] of [...en, ...fr]) expect(text.trim(), path).not.toBe("");
  });

  it("uses the same placeholders in both languages", () => {
    for (const [path, text] of en) {
      expect(placeholders(fr.get(path) ?? ""), path).toEqual(placeholders(text));
    }
  });
});
