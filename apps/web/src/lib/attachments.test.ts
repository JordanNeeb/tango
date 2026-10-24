import { describe, expect, it } from "vitest";

import { formData } from "../../../../test/supabase";

import {
  ACCEPT,
  ALLOWED_TYPES,
  attachmentKind,
  fileType,
  formatBytes,
  MAX_BYTES,
  MAX_FILES,
  parseAttachments,
  validatePicked,
} from "./attachments";

const FAMILY = "123e4567-e89b-12d3-a456-426614174000";
const FILE = "223e4567-e89b-12d3-a456-426614174000";
const plain = (text: string) => text.replace(/\s/g, " ");

describe("attachmentKind", () => {
  it.each([
    ["image/jpeg", "image"],
    ["image/png", "image"],
    ["image/webp", "image"],
    ["image/gif", "image"],
    ["image/heic", "download"],
    ["image/heif", "download"],
    ["video/mp4", "video"],
    ["video/quicktime", "video"],
    ["video/webm", "video"],
    ["application/pdf", "pdf"],
    ["application/msword", "download"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "download"],
    ["application/vnd.ms-excel", "download"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "download"],
    ["application/vnd.ms-powerpoint", "download"],
    ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "download"],
    ["text/html", "download"],
  ])("%s opens as %s", (mime, kind) => {
    expect(attachmentKind(mime)).toBe(kind);
  });
});

describe("fileType", () => {
  it("keeps an allowed type", () => {
    expect(fileType({ name: "a.bin", type: "image/png" })).toBe("image/png");
  });

  it("falls back to the extension for an untyped or generic file", () => {
    expect(fileType({ name: "IMG_1.HEIC", type: "" })).toBe("image/heic");
    expect(fileType({ name: "plan.docx", type: "application/octet-stream" })).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });

  it.each([
    { name: "page.html", type: "text/html" },
    { name: "logo.svg", type: "image/svg+xml" },
    { name: "fake.png", type: "text/html" },
    { name: "notes.txt", type: "" },
    { name: "pdf", type: "" },
  ])("rejects $name ($type)", (file) => {
    expect(fileType(file)).toBeUndefined();
  });

  it("offers every allowed type in the picker", () => {
    for (const type of ALLOWED_TYPES) expect(ACCEPT.split(",")).toContain(type);
    expect(ACCEPT.split(",")).toContain(".heic");
  });
});

describe("validatePicked", () => {
  const photo = (name: string, size = 1000) => ({ name, type: "image/jpeg", size });

  it("accepts up to 10 files of up to 50 MB", () => {
    const files = Array.from({ length: MAX_FILES }, (_, i) => photo(`${i}.jpg`, MAX_BYTES));
    expect(validatePicked(files)).toEqual([]);
  });

  it("refuses an 11th file", () => {
    const files = Array.from({ length: MAX_FILES + 1 }, (_, i) => photo(`${i}.jpg`));
    expect(validatePicked(files)).toEqual([{ reason: "count" }]);
  });

  it("names each file over 50 MB or of the wrong type", () => {
    expect(
      validatePicked([
        photo("big.jpg", MAX_BYTES + 1),
        photo("ok.jpg"),
        { name: "page.html", type: "text/html", size: MAX_BYTES + 1 },
      ]),
    ).toEqual([
      { reason: "size", name: "big.jpg" },
      { reason: "type", name: "page.html" },
    ]);
  });
});

describe("formatBytes", () => {
  it.each([
    [512, "en", "512 bytes"],
    [1536, "en", "2 kB"],
    [1024 * 1024 * 1.5, "en", "1.5 MB"],
    [MAX_BYTES, "en", "50 MB"],
    [1024 * 1024 * 1.5, "fr", "1,5 Mo"],
  ] as const)("%d bytes in %s", (bytes, language, expected) => {
    expect(plain(formatBytes(bytes, language))).toBe(expected);
  });
});

describe("parseAttachments", () => {
  const form = (pairs: [string, string][]) => {
    const data = formData({});
    for (const [path, name] of pairs) {
      data.append("attachmentPath", path);
      data.append("attachmentName", name);
    }
    return data;
  };

  it("returns no attachments when none are posted", () => {
    expect(parseAttachments(formData({ body: "hi" }))).toEqual([]);
  });

  it("returns paths and trimmed names in order", () => {
    expect(
      parseAttachments(form([[`${FAMILY}/${FILE}`, " photo.jpg "], [`${FAMILY}/${FAMILY}`, "b.pdf"]])),
    ).toEqual([
      { path: `${FAMILY}/${FILE}`, name: "photo.jpg" },
      { path: `${FAMILY}/${FAMILY}`, name: "b.pdf" },
    ]);
  });

  it("allows 10 attachments and refuses 11", () => {
    const pairs = (n: number) =>
      Array.from({ length: n }, () => [`${FAMILY}/${FILE}`, "a.jpg"] as [string, string]);
    expect(parseAttachments(form(pairs(MAX_FILES)))).toHaveLength(MAX_FILES);
    expect(parseAttachments(form(pairs(MAX_FILES + 1)))).toBeNull();
  });

  it.each([
    ["../x", "a.jpg"],
    [`${FAMILY}/${FILE}/x`, "a.jpg"],
    ["a/b/c", "a.jpg"],
    [FILE, "a.jpg"],
    [`${FAMILY}/../${FILE}`, "a.jpg"],
    [`${FAMILY}/${FILE}`, "   "],
    [`${FAMILY}/${FILE}`, "a".repeat(256)],
  ])("refuses path %j with name %j", (path, name) => {
    expect(parseAttachments(form([[path, name]]))).toBeNull();
  });

  it("allows a 255-character name", () => {
    expect(parseAttachments(form([[`${FAMILY}/${FILE}`, "a".repeat(255)]]))).toHaveLength(1);
  });

  it("refuses unpaired paths and names", () => {
    const data = form([[`${FAMILY}/${FILE}`, "a.jpg"]]);
    data.append("attachmentPath", `${FAMILY}/${FILE}`);
    expect(parseAttachments(data)).toBeNull();
  });
});
