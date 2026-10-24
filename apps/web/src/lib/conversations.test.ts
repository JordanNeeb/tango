import { getMessages } from "@tango/shared";
import { describe, expect, it } from "vitest";

import {
  BODY_MAX,
  cleanBody,
  cleanSubject,
  SUBJECT_MAX,
  UUID,
  validateBody,
  validateSubject,
} from "./conversations";

const errors = getMessages("en").conversations.errors;

describe("cleanSubject", () => {
  it("trims both ends", () => {
    expect(cleanSubject("  School pickup \n")).toBe("School pickup");
  });
});

describe("cleanBody", () => {
  it("trims the ends but keeps inner newlines", () => {
    expect(cleanBody("\n\t Hi,\n\nSee you Friday. \r\n")).toBe("Hi,\n\nSee you Friday.");
  });

  it("keeps a non-breaking space at the ends, as the database does", () => {
    expect(cleanBody(" hi ")).toBe(" hi ");
  });
});

describe("validateSubject", () => {
  it("requires a subject", () => {
    expect(validateSubject("", errors)).toBe(errors.subjectRequired);
  });

  it("allows exactly the maximum length", () => {
    expect(validateSubject("a".repeat(SUBJECT_MAX), errors)).toBeUndefined();
    expect(validateSubject("a".repeat(SUBJECT_MAX + 1), errors)).toBe(errors.subjectTooLong);
  });

  it("counts an emoji as one character", () => {
    expect(validateSubject("😀".repeat(SUBJECT_MAX), errors)).toBeUndefined();
  });
});

describe("validateBody", () => {
  it("requires visible text", () => {
    expect(validateBody("", errors)).toBe(errors.bodyRequired);
    expect(validateBody(" \n\t", errors)).toBe(errors.bodyRequired);
    expect(validateBody("  ", errors)).toBe(errors.bodyRequired);
  });

  it("allows exactly the maximum length", () => {
    expect(validateBody("a".repeat(BODY_MAX), errors)).toBeUndefined();
    expect(validateBody("a".repeat(BODY_MAX + 1), errors)).toBe(errors.bodyTooLong);
  });

  it("counts code points, not UTF-16 units", () => {
    expect(validateBody("😀".repeat(BODY_MAX), errors)).toBeUndefined();
  });
});

describe("UUID", () => {
  it("matches uuids in either case only", () => {
    expect(UUID.test("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(UUID.test("123E4567-E89B-12D3-A456-426614174000")).toBe(true);
    expect(UUID.test("123e4567e89b12d3a456426614174000")).toBe(false);
    expect(UUID.test(" 123e4567-e89b-12d3-a456-426614174000")).toBe(false);
    expect(UUID.test("not-a-uuid")).toBe(false);
  });
});
