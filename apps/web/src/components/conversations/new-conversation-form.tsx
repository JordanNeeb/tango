"use client";

import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { type KeyboardEvent, useActionState, useRef, useState } from "react";

import { startConversation } from "@/app/[lang]/(app)/messages/actions";
import { errorTextClass } from "@/components/auth/styles";
import { useFocusFirstError } from "@/components/auth/use-focus-first-error";
import { type ConversationActionResult } from "@/lib/conversations";
import { useMessages } from "@/lib/i18n/language-provider";

import { ComposerField } from "./composer-field";
import { type Contact } from "./types";
import { appendAttachments, uploadAttachments, useAttachmentPicker } from "./use-attachments";

// The dashboard header search's field style, so the overlay below can share it.
const fieldText = "py-2 text-base sm:text-sm/6";
const headerFieldClass = `col-start-1 row-start-1 block w-full min-w-0 bg-white text-gray-900 outline-hidden placeholder:text-gray-400 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 ${fieldText}`;

// To, completed inline: the rest of the first contact whose name starts with
// the typed text shows in grey after it, and Tab or Arrow Right at the end
// accepts it. The overlay repeats the typed text invisibly so the rest lines
// up after the caret.
function RecipientField({
  contacts,
  value,
  onChange,
}: {
  contacts: Contact[];
  value: string;
  onChange: (value: string) => void;
}) {
  const label = useMessages().conversations.to;
  const typed = value.toLowerCase();
  const match = typed
    ? contacts.find((contact) => contact.name.toLowerCase().startsWith(typed))
    : undefined;
  const rest = match ? match.name.slice(value.length) : "";

  const accept = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!match || !rest) return;
    const input = event.currentTarget;
    const atEnd = input.selectionStart === value.length && input.selectionEnd === value.length;
    if ((event.key === "Tab" && !event.shiftKey) || (event.key === "ArrowRight" && atEnd)) {
      event.preventDefault();
      onChange(match.name);
    }
  };

  return (
    <div className="grid grid-cols-1">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={accept}
        placeholder={label}
        aria-label={label}
        aria-autocomplete="inline"
        autoComplete="off"
        autoFocus
        className={headerFieldClass}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none col-start-1 row-start-1 overflow-hidden whitespace-pre ${fieldText}`}
      >
        <span className="invisible">{value}</span>
        <span className="text-gray-400 dark:text-gray-500">{rest}</span>
      </span>
    </div>
  );
}

// A new conversation laid out like an open one: To and Subject in the header,
// an empty message area, and the composer. Send waits for a recipient (a
// contact's exact name, ignoring case), a subject, and a message or file. The
// recipient posts its family, which `start_conversation` checks the parent
// belongs to. React resets the form after each submission; To and Subject are
// state, and the message comes back from the result after an error.
export function NewConversationForm({ contacts }: { contacts: Contact[] }) {
  const messages = useMessages().conversations;
  const formRef = useRef<HTMLFormElement>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [hasText, setHasText] = useState(false);
  const picker = useAttachmentPicker();
  const [state, formAction, pending] = useActionState<ConversationActionResult, FormData>(
    async (previous, formData) => {
      // Files go straight to the recipient family's storage folder first; the
      // action gets their paths. A successful start opens the conversation.
      if (picker.files.length) {
        const uploaded = await uploadAttachments(String(formData.get("familyId") ?? ""), picker.files);
        if (!uploaded) {
          const body = String(formData.get("body") ?? "");
          setHasText(Boolean(body.trim()));
          return { formError: messages.errors.uploadFailed, values: { body } };
        }
        appendAttachments(formData, uploaded);
      }
      const result = await startConversation(previous, formData);
      setHasText(Boolean(result.values?.body));
      return result;
    },
    {},
  );
  useFocusFirstError(formRef, state);

  const recipient = contacts.find(
    (contact) => contact.name.toLowerCase() === to.trim().toLowerCase(),
  );
  const subjectError = state.fieldErrors?.subject;
  const canSend =
    recipient !== undefined && subject.trim() !== "" && (hasText || picker.files.length > 0);

  return (
    <form ref={formRef} action={formAction} noValidate className="flex h-full flex-col">
      <input type="hidden" name="familyId" value={recipient?.familyId ?? ""} />
      <div className="flex items-start gap-x-4 border-b border-gray-200 px-4 py-2 sm:px-6 lg:px-8 dark:border-white/10">
        <Link
          href="/messages"
          className="-mx-2.5 p-2.5 text-gray-700 hover:text-gray-900 split:hidden dark:text-gray-400 dark:hover:text-white"
        >
          <span className="sr-only">{messages.back}</span>
          <ChevronLeftIcon aria-hidden="true" className="size-6" />
        </Link>
        <div className="min-w-0 flex-1 divide-y divide-gray-200 dark:divide-white/10">
          <RecipientField contacts={contacts} value={to} onChange={setTo} />
          <div>
            <input
              name="subject"
              type="text"
              autoComplete="off"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder={messages.subjectLabel}
              aria-label={messages.subjectLabel}
              aria-invalid={subjectError ? true : undefined}
              aria-describedby={subjectError ? "subject-error" : undefined}
              className={headerFieldClass}
            />
            {subjectError ? (
              <p id="subject-error" className={`${errorTextClass} mb-2`}>
                {subjectError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <div className="border-t border-gray-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-white/10">
        {state.formError ? (
          <p
            role="alert"
            className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300"
          >
            {state.formError}
          </p>
        ) : null}
        <ComposerField
          defaultValue={state.values?.body}
          error={state.fieldErrors?.body}
          pending={pending}
          canSend={canSend}
          onTextChange={setHasText}
          picker={picker}
        />
      </div>
    </form>
  );
}
