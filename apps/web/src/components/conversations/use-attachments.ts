"use client";

import { useEffect, useRef, useState } from "react";

import {
  type AttachmentInput,
  attachmentKind,
  fileType,
  MAX_FILES,
  type PickError,
  validatePicked,
} from "@/lib/attachments";
import { createClient } from "@/lib/supabase/client";

// A picked file, with a local preview link for photos the browser can show.
export type PickedFile = { file: File; preview: string | null };

// The files picked or pasted for the next message. Each pick keeps the files
// that pass and reports the ones that don't (wrong type, over 50 MB, or past
// 10 files), so nothing invalid is ever uploaded. Photo previews are object
// URLs, made when a file is added and released when it's removed or the
// composer goes away.
export function useAttachmentPicker() {
  const [items, setItems] = useState<PickedFile[]>([]);
  const [errors, setErrors] = useState<PickError[]>([]);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => () => release(itemsRef.current), []);

  const add = (picked: File[]) => {
    const problems: PickError[] = [];
    const next = [...items];
    for (const file of picked) {
      const [problem] = validatePicked([file]);
      if (problem) problems.push(problem);
      else if (next.length < MAX_FILES) {
        const preview =
          attachmentKind(fileType(file) ?? "") === "image" ? URL.createObjectURL(file) : null;
        next.push({ file, preview });
      } else if (!problems.some((known) => known.reason === "count")) {
        problems.push({ reason: "count" });
      }
    }
    setItems(next);
    setErrors(problems);
  };

  const remove = (index: number) => {
    release(items.filter((_, i) => i === index));
    setItems(items.filter((_, i) => i !== index));
    setErrors([]);
  };

  const clear = () => {
    release(items);
    setItems([]);
    setErrors([]);
  };

  return { items, files: items.map((item) => item.file), errors, add, remove, clear };
}

function release(items: PickedFile[]) {
  for (const { preview } of items) if (preview) URL.revokeObjectURL(preview);
}

// Uploads the files to the family's folder in the attachments bucket, each
// under a new random name. Returns their paths and names in order, or null if
// any upload fails; the send then stops and the files stay picked to retry.
export async function uploadAttachments(
  familyId: string,
  files: File[],
): Promise<AttachmentInput[] | null> {
  const storage = createClient().storage.from("attachments");
  const results = await Promise.all(
    files.map(async (file) => {
      const path = `${familyId}/${crypto.randomUUID()}`;
      const { error } = await storage.upload(path, file, {
        contentType: fileType(file),
        upsert: false,
      });
      if (error) {
        console.error("[messages] upload failed", { message: error.message });
        return null;
      }
      return { path, name: file.name };
    }),
  );
  return results.every((result) => result !== null) ? results : null;
}

// Adds uploaded files to a send form, in order.
export function appendAttachments(formData: FormData, attachments: AttachmentInput[]) {
  for (const { path, name } of attachments) {
    formData.append("attachmentPath", path);
    formData.append("attachmentName", name);
  }
}
