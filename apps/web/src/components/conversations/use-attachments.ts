"use client";

import { useState } from "react";

import {
  type AttachmentInput,
  fileType,
  MAX_FILES,
  type PickError,
  validatePicked,
} from "@/lib/attachments";
import { createClient } from "@/lib/supabase/client";

// The files picked for the next message. Each pick keeps the files that pass
// and reports the ones that don't (wrong type, over 50 MB, or past 10 files),
// so nothing invalid is ever uploaded.
export function useAttachmentPicker() {
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<PickError[]>([]);

  const add = (picked: File[]) => {
    const problems: PickError[] = [];
    const next = [...files];
    for (const file of picked) {
      const [problem] = validatePicked([file]);
      if (problem) problems.push(problem);
      else if (next.length < MAX_FILES) next.push(file);
      else if (!problems.some((known) => known.reason === "count")) problems.push({ reason: "count" });
    }
    setFiles(next);
    setErrors(problems);
  };

  const remove = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setErrors([]);
  };

  const clear = () => {
    setFiles([]);
    setErrors([]);
  };

  return { files, errors, add, remove, clear };
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
