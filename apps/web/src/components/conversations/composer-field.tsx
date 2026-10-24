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
        {/* The box and its padding wrap the textarea, so scrolling text always
            keeps padding below it. The textarea grows with its text
            (field-sizing) up to 4 lines, then scrolls. */}
        <div className="min-w-0 flex-1 rounded-3xl bg-white px-4 py-2.5 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 has-[[aria-invalid=true]]:outline-red-500 dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-indigo-500 dark:has-[[aria-invalid=true]]:outline-red-400">
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
            className="block max-h-[4lh] min-h-6 w-full resize-none field-sizing-content overflow-y-auto bg-transparent p-0 text-base/6 text-gray-900 outline-hidden placeholder:text-gray-400 sm:text-sm/6 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>
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
