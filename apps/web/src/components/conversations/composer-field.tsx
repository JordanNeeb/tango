"use client";

import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useId } from "react";

import { errorTextClass } from "@/components/auth/styles";
import { useMessages } from "@/lib/i18n/language-provider";

// The message textarea and round send button at the bottom of a chat, shared
// by an open conversation and the new message screen. The form around it
// decides when sending is allowed.
export function ComposerField({
  defaultValue,
  error,
  pending,
  canSend,
  onTextChange,
}: {
  defaultValue?: string;
  error?: string;
  pending: boolean;
  canSend: boolean;
  onTextChange: (hasText: boolean) => void;
}) {
  const messages = useMessages().conversations;
  const id = useId();
  return (
    <>
      <div className="flex items-end gap-x-3">
        <label htmlFor={id} className="sr-only">
          {messages.composerLabel}
        </label>
        {/* Grows with its text (field-sizing) up to 4 lines plus padding, then scrolls. */}
        <textarea
          id={id}
          name="body"
          rows={1}
          placeholder={messages.composerPlaceholder}
          defaultValue={defaultValue}
          readOnly={pending}
          onChange={(event) => onTextChange(event.target.value.trim() !== "")}
          onKeyDown={(event) => {
            // Enter sends and Shift+Enter breaks the line. Enter that ends an
            // IME composition (accents, CJK input) is left to the IME.
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            if (canSend && !pending) event.currentTarget.form?.requestSubmit();
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="block max-h-[calc(4lh+1.25rem)] min-h-11 flex-1 resize-none field-sizing-content overflow-y-auto rounded-3xl bg-white px-4 py-2.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 aria-invalid:outline-red-500 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500 dark:aria-invalid:outline-red-400"
        />
        <button
          type="submit"
          disabled={pending || !canSend}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500 dark:disabled:hover:bg-indigo-500"
        >
          <span className="sr-only">{pending ? messages.sending : messages.send}</span>
          <PaperAirplaneIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} className={errorTextClass}>
          {error}
        </p>
      ) : null}
    </>
  );
}
