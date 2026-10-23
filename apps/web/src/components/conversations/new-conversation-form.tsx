"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";

import { startConversation } from "@/app/[lang]/(app)/messages/actions";
import { FormAlert, SubmitButton } from "@/components/auth/fields";
import {
  errorTextClass,
  inputClass,
  labelClass,
  saveButtonClass,
  textButtonClass,
} from "@/components/auth/styles";
import { useFocusFirstError } from "@/components/auth/use-focus-first-error";
import { type ConversationActionResult } from "@/lib/conversations";
import { useMessages } from "@/lib/i18n/language-provider";

// Starts a conversation with its subject and first message, then opens it.
// The fields follow the Tailwind Plus form styles the profile form uses.
export function NewConversationForm({ familyId }: { familyId: string }) {
  const messages = useMessages().conversations;
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState<ConversationActionResult, FormData>(
    startConversation,
    {},
  );
  useFocusFirstError(formRef, state);

  const subjectError = state.fieldErrors?.subject;
  const bodyError = state.fieldErrors?.body;

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <form ref={formRef} action={formAction} noValidate className="max-w-2xl space-y-6">
        <h2 className="text-base/7 font-semibold text-gray-900 dark:text-white">
          {messages.newConversation}
        </h2>
        <FormAlert error={state.formError} />
        <input type="hidden" name="familyId" value={familyId} />
        <div>
          <label htmlFor="subject" className={labelClass}>
            {messages.subjectLabel}
          </label>
          <div className="mt-2">
            <input
              id="subject"
              name="subject"
              type="text"
              required
              autoComplete="off"
              defaultValue={state.values?.subject}
              aria-invalid={subjectError ? true : undefined}
              aria-describedby={subjectError ? "subject-error" : undefined}
              className={inputClass}
            />
          </div>
          {subjectError ? (
            <p id="subject-error" className={errorTextClass}>
              {subjectError}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="body" className={labelClass}>
            {messages.bodyLabel}
          </label>
          <div className="mt-2">
            <textarea
              id="body"
              name="body"
              rows={6}
              required
              defaultValue={state.values?.body}
              aria-invalid={bodyError ? true : undefined}
              aria-describedby={bodyError ? "body-error" : undefined}
              className={inputClass}
            />
          </div>
          {bodyError ? (
            <p id="body-error" className={errorTextClass}>
              {bodyError}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-x-6">
          <Link href="/messages" className={textButtonClass}>
            {messages.cancel}
          </Link>
          <SubmitButton
            label={messages.start}
            pendingLabel={messages.starting}
            className={saveButtonClass}
          />
        </div>
      </form>
    </div>
  );
}
