import { getMessages } from "@tango/shared";
import { describe, expect, it } from "vitest";

import {
  hasErrors,
  isAccountType,
  readText,
  validateEmail,
  validateName,
  validateNewPassword,
} from "./validation";

const errors = getMessages("en").auth.errors;

describe("validateEmail", () => {
  it("trims and accepts a valid address", () => {
    expect(validateEmail("  sam@example.ca ", errors)).toEqual({ email: "sam@example.ca" });
  });

  it("requires an address", () => {
    expect(validateEmail("   ", errors)).toEqual({ email: "", error: errors.emailRequired });
  });

  it.each(["sam", "sam@", "sam@example", "@example.ca", "sam @example.ca", "a@b@c.ca"])(
    "rejects %j",
    (raw) => {
      expect(validateEmail(raw, errors).error).toBe(errors.emailInvalid);
    },
  );

  it("rejects addresses over 254 characters", () => {
    const long = `${"a".repeat(243)}@example.ca`;
    expect(long).toHaveLength(254);
    expect(validateEmail(long, errors).error).toBeUndefined();
    expect(validateEmail(`a${long}`, errors).error).toBe(errors.emailInvalid);
  });
});

describe("validateNewPassword", () => {
  it("accepts 8 to 72 characters", () => {
    expect(validateNewPassword("a".repeat(8), errors)).toBeUndefined();
    expect(validateNewPassword("a".repeat(72), errors)).toBeUndefined();
  });

  it("rejects shorter or longer passwords", () => {
    expect(validateNewPassword("a".repeat(7), errors)).toBe(errors.passwordLength);
    expect(validateNewPassword("a".repeat(73), errors)).toBe(errors.passwordLength);
  });
});

describe("validateName", () => {
  it("trims and accepts 1 to 100 characters", () => {
    expect(validateName("  Sam  ", "bad")).toEqual({ name: "Sam" });
    expect(validateName("a".repeat(100), "bad").error).toBeUndefined();
  });

  it("rejects blank or overlong names", () => {
    expect(validateName("   ", "bad")).toEqual({ name: "", error: "bad" });
    expect(validateName("a".repeat(101), "bad").error).toBe("bad");
  });
});

describe("isAccountType", () => {
  it("accepts parent and professional only", () => {
    expect(isAccountType("parent")).toBe(true);
    expect(isAccountType("professional")).toBe(true);
    expect(isAccountType("Parent")).toBe(false);
    expect(isAccountType(null)).toBe(false);
  });
});

describe("readText", () => {
  it("reads strings and treats missing values and files as empty", () => {
    const form = new FormData();
    form.set("name", "Sam");
    form.set("file", new Blob(["x"]));
    expect(readText(form, "name")).toBe("Sam");
    expect(readText(form, "missing")).toBe("");
    expect(readText(form, "file")).toBe("");
  });
});

describe("hasErrors", () => {
  it("is true only when a field has a message", () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ name: undefined, email: "" })).toBe(false);
    expect(hasErrors({ email: "Required" })).toBe(true);
  });
});
