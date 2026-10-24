import { type Language } from "@tango/shared";

// The database and the storage bucket enforce the same limits and types
// (attachments migration).
export const MAX_FILES = 10;
export const MAX_BYTES = 50 * 1024 * 1024;
export const NAME_MAX = 255;

// How a parent opens an attachment: photos and videos in the viewer, PDFs in
// the browser's own viewer, and everything browsers can't show (HEIC photos,
// Office documents) as a download.
export type AttachmentKind = "image" | "video" | "pdf" | "download";

const TYPES: Record<string, { kind: AttachmentKind; extensions: string[] }> = {
  "image/jpeg": { kind: "image", extensions: ["jpg", "jpeg"] },
  "image/png": { kind: "image", extensions: ["png"] },
  "image/webp": { kind: "image", extensions: ["webp"] },
  "image/gif": { kind: "image", extensions: ["gif"] },
  "image/heic": { kind: "download", extensions: ["heic"] },
  "image/heif": { kind: "download", extensions: ["heif"] },
  "video/mp4": { kind: "video", extensions: ["mp4", "m4v"] },
  "video/quicktime": { kind: "video", extensions: ["mov"] },
  "video/webm": { kind: "video", extensions: ["webm"] },
  "application/pdf": { kind: "pdf", extensions: ["pdf"] },
  "application/msword": { kind: "download", extensions: ["doc"] },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    kind: "download",
    extensions: ["docx"],
  },
  "application/vnd.ms-excel": { kind: "download", extensions: ["xls"] },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    kind: "download",
    extensions: ["xlsx"],
  },
  "application/vnd.ms-powerpoint": { kind: "download", extensions: ["ppt"] },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    kind: "download",
    extensions: ["pptx"],
  },
};

export const ALLOWED_TYPES = Object.keys(TYPES);

// For the file input's `accept`: every allowed type and extension.
export const ACCEPT = Object.entries(TYPES)
  .flatMap(([type, { extensions }]) => [type, ...extensions.map((ext) => `.${ext}`)])
  .join(",");

export function attachmentKind(mimeType: string): AttachmentKind {
  return TYPES[mimeType]?.kind ?? "download";
}

// A picked file's type. Some browsers leave HEIC and Office files untyped, so
// an empty or generic type falls back to the extension. Undefined when the
// file isn't an allowed type.
export function fileType(file: { name: string; type: string }): string | undefined {
  if (TYPES[file.type]) return file.type;
  if (file.type && file.type !== "application/octet-stream") return undefined;
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (!extension || extension === file.name.toLowerCase()) return undefined;
  return Object.entries(TYPES).find(([, { extensions }]) => extensions.includes(extension))?.[0];
}

export type PickError =
  | { reason: "count" }
  | { reason: "type" | "size"; name: string };

// Everything wrong with a set of picked files: too many, and each file's first
// problem, in pick order.
export function validatePicked(
  files: { name: string; type: string; size: number }[],
): PickError[] {
  const errors: PickError[] = files.length > MAX_FILES ? [{ reason: "count" }] : [];
  for (const file of files) {
    if (!fileType(file)) errors.push({ reason: "type", name: file.name });
    else if (file.size > MAX_BYTES) errors.push({ reason: "size", name: file.name });
  }
  return errors;
}

// Sizes in binary units, as file managers show them: "820 kB", "1.5 MB".
export function formatBytes(bytes: number, language: Language): string {
  const locale = `${language}-CA`;
  const [unit, value] =
    bytes < 1024
      ? (["byte", bytes] as const)
      : bytes < 1024 * 1024
        ? (["kilobyte", bytes / 1024] as const)
        : (["megabyte", bytes / (1024 * 1024)] as const);
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit,
    maximumFractionDigits: unit === "megabyte" ? 1 : 0,
  }).format(value);
}

// `<family id>/<random uuid>` in the attachments bucket; never the file name.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const ATTACHMENT_PATH = new RegExp(`^${UUID}/${UUID}$`, "i");

export type AttachmentInput = { path: string; name: string };

// The uploaded files a send form posts, as `attachmentPath` and
// `attachmentName` pairs in upload order. Null when anything is malformed, so
// the action refuses the send rather than dropping a file.
export function parseAttachments(formData: FormData): AttachmentInput[] | null {
  const paths = formData.getAll("attachmentPath");
  const names = formData.getAll("attachmentName");
  if (paths.length !== names.length || paths.length > MAX_FILES) return null;
  const attachments: AttachmentInput[] = [];
  for (const [index, path] of paths.entries()) {
    const raw = names[index];
    if (typeof path !== "string" || typeof raw !== "string") return null;
    const name = raw.trim();
    if (!ATTACHMENT_PATH.test(path) || !name || Array.from(name).length > NAME_MAX) return null;
    attachments.push({ path, name });
  }
  return attachments;
}
