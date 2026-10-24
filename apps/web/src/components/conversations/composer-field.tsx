"use client";

import {
  DocumentIcon,
  FilmIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useId, useRef, useState } from "react";

import { errorTextClass } from "@/components/auth/styles";
import { ACCEPT, attachmentKind, fileType, formatBytes, type PickError } from "@/lib/attachments";
import { useLanguage, useMessages } from "@/lib/i18n/language-provider";

import { type PickedFile, type useAttachmentPicker } from "./use-attachments";

// A picked file inside the composer: a small thumbnail for photos the browser
// can show, otherwise an icon with the name and size. A photo that can't be
// previewed (such as HEIC) falls back to the icon tile.
function PickedFileTile({
  item,
  disabled,
  onRemove,
}: {
  item: PickedFile;
  disabled: boolean;
  onRemove: () => void;
}) {
  const messages = useMessages().conversations.attachments;
  const language = useLanguage();
  const [failed, setFailed] = useState(false);
  const { file, preview } = item;
  const video = attachmentKind(fileType(file) ?? "") === "video";
  const Icon = video ? FilmIcon : DocumentIcon;
  return (
    <li className="relative max-w-full">
      {preview && !failed ? (
        // A local object URL; next/image can't optimize it.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={file.name}
          onError={() => setFailed(true)}
          className="size-14 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-white/10"
        />
      ) : (
        <div className="flex h-14 w-44 max-w-full items-center gap-x-2 rounded-lg bg-gray-50 px-2.5 ring-1 ring-gray-200 ring-inset dark:bg-white/5 dark:ring-white/10">
          <Icon aria-hidden="true" className="size-6 shrink-0 text-gray-400 dark:text-gray-500" />
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium text-gray-900 dark:text-white">
              {file.name}
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {formatBytes(file.size, language)}
            </span>
          </span>
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-gray-700 text-white ring-2 ring-white hover:bg-gray-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-500 dark:ring-gray-900 dark:hover:bg-gray-400"
      >
        <span className="sr-only">{messages.remove.replace("{name}", () => file.name)}</span>
        <XMarkIcon aria-hidden="true" className="size-3.5" />
      </button>
    </li>
  );
}

// The message textarea, paperclip, and round send button at the bottom of a
// chat, shared by an open conversation and the new message screen. Picked or
// pasted files show inside the box above the text. The form around it
// decides when sending is allowed and uploads the files.
export function ComposerField({
  defaultValue,
  error,
  pending,
  canSend,
  onTextChange,
  picker,
}: {
  defaultValue?: string;
  error?: string;
  pending: boolean;
  canSend: boolean;
  onTextChange: (hasText: boolean) => void;
  picker: ReturnType<typeof useAttachmentPicker>;
}) {
  const messages = useMessages().conversations;
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickMessage = (problem: PickError) =>
    problem.reason === "count"
      ? messages.errors.fileCount
      : (problem.reason === "type" ? messages.errors.fileType : messages.errors.fileSize).replace(
          "{name}",
          () => problem.name,
        );
  const described = [error ? `${id}-error` : "", picker.errors.length ? `${id}-files-error` : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div className="flex items-end gap-x-3">
        {/* Not named, so the form never posts the files themselves; the form
            uploads them and posts their storage paths. */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT}
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
          onChange={(event) => {
            picker.add(Array.from(event.target.files ?? []));
            // Lets the same file be picked again after it's removed.
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <span className="sr-only">{messages.attachments.attach}</span>
          <PaperClipIcon aria-hidden="true" className="size-6" />
        </button>
        <label htmlFor={id} className="sr-only">
          {messages.composerLabel}
        </label>
        {/* The box and its padding wrap the picked files and the textarea, so
            scrolling text always keeps padding below it. The textarea grows
            with its text (field-sizing) up to 4 lines, then scrolls. */}
        <div className="min-w-0 flex-1 rounded-3xl bg-white px-4 py-2.5 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 has-[[aria-invalid=true]]:outline-red-500 dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-indigo-500 dark:has-[[aria-invalid=true]]:outline-red-400">
          {picker.items.length ? (
            <ul role="list" aria-label={messages.attachments.label} className="mt-1 mb-2.5 flex flex-wrap gap-2">
              {picker.items.map((item, index) => (
                <PickedFileTile
                  key={`${index}:${item.file.name}:${item.file.size}`}
                  item={item}
                  disabled={pending}
                  onRemove={() => picker.remove(index)}
                />
              ))}
            </ul>
          ) : null}
          <textarea
            id={id}
            name="body"
            rows={1}
            placeholder={messages.composerPlaceholder}
            defaultValue={defaultValue}
            readOnly={pending}
            onChange={(event) => onTextChange(event.target.value.trim() !== "")}
            onPaste={(event) => {
              // Pasted files and screenshots become attachments; pasted text
              // goes into the box as usual.
              const files = Array.from(event.clipboardData.files);
              if (!files.length || pending) return;
              event.preventDefault();
              picker.add(files);
            }}
            onKeyDown={(event) => {
              // Enter sends and Shift+Enter breaks the line. Enter that ends an
              // IME composition (accents, CJK input) is left to the IME.
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              if (canSend && !pending) event.currentTarget.form?.requestSubmit();
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={described || undefined}
            className="block max-h-[4lh] min-h-6 w-full resize-none field-sizing-content overflow-y-auto bg-transparent p-0 text-base/6 text-gray-900 outline-hidden placeholder:text-gray-400 sm:text-sm/6 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending || !canSend}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500 dark:disabled:hover:bg-indigo-500"
        >
          <span className="sr-only">
            {pending
              ? picker.files.length
                ? messages.attachments.uploading
                : messages.sending
              : messages.send}
          </span>
          <PaperAirplaneIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className={errorTextClass}>
          {error}
        </p>
      ) : null}
      <div id={`${id}-files-error`} aria-live="polite">
        {picker.errors.map((problem) => (
          <p key={problem.reason === "count" ? "count" : `${problem.reason}:${problem.name}`} className={errorTextClass}>
            {pickMessage(problem)}
          </p>
        ))}
      </div>
    </>
  );
}
