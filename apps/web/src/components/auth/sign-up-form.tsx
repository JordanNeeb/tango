"use client";

import { useActionState, useRef } from "react";

import { signUp } from "@/app/[lang]/(auth)/actions";
import { useMessages } from "@/lib/i18n/language-provider";
import { type AccountType, type ActionResult } from "@/lib/auth/validation";

import { FormAlert, SubmitButton, TextField } from "./fields";
import { GoogleSignInButton } from "./google-sign-in-button";
import { useFocusFirstError } from "./use-focus-first-error";

export function SignUpForm({
  accountType,
  defaultEmail,
}: {
  accountType: AccountType;
  defaultEmail?: string;
}) {
  const { auth } = useMessages();
  const [state, formAction] = useActionState<ActionResult, FormData>(signUp, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state);

  if (state.notice) return <FormAlert notice={state.notice} />;

  return (
    <>
      <form ref={formRef} action={formAction} noValidate className="space-y-6">
        <FormAlert error={state.formError} />
        <input type="hidden" name="type" value={accountType} />

        <TextField
          id="name"
          name="name"
          label={auth.fields.name}
          autoComplete="name"
          defaultValue={state.values?.name}
          error={state.fieldErrors?.name}
        />

        <TextField
          id="email"
          name="email"
          type="email"
          label={auth.fields.email}
          autoComplete="email"
          defaultValue={state.values?.email ?? defaultEmail}
          error={state.fieldErrors?.email}
        />

        <TextField
          id="password"
          name="password"
          type="password"
          label={auth.fields.password}
          autoComplete="new-password"
          error={state.fieldErrors?.password}
          hint={auth.fields.passwordHint}
        />

        <SubmitButton
          label={auth.signUp.submit}
          pendingLabel={auth.signUp.submitting}
        />
      </form>

      <GoogleSignInButton accountType={accountType} />
    </>
  );
}
