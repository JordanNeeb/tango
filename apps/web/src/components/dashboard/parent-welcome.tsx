"use client";

import Link from "next/link";
import { useActionState, useRef, useSyncExternalStore } from "react";

import { resendInvite, sendInvite } from "@/app/[lang]/dashboard/actions";
import { FormAlert, SubmitButton } from "@/components/auth/fields";
import { errorTextClass, linkClass } from "@/components/auth/styles";
import { useFocusFirstError } from "@/components/auth/use-focus-first-error";
import { type ActionResult } from "@/lib/auth/validation";
import { useLanguage, useMessages } from "@/lib/i18n/language-provider";

export type WelcomeData = {
  hasName: boolean;
  sent: { id: string; email: string; expiresAt: string; timeZone: string } | null;
};

// Inserts values literally, so `$` patterns in names aren't expanded.
function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

function subscribeNever() {
  return () => {};
}

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
}

// Ported from the Tailwind Plus call-to-action section
// (design/references/tailwind-plus/marketing/cta-dark.jsx, which carries both
// themes; cta-light.jsx is its light half). Its two links are replaced by the
// invite controls: an email field and an invite button. The dashboard is always
// dark but these classes follow the OS theme, so the section sets its own
// surface for each theme.
const buttonClass =
  "shrink-0 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500";

const emailInputClass =
  "min-w-0 flex-auto rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 aria-invalid:outline-red-500 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500 dark:aria-invalid:outline-red-400";

const statusTextClass = "text-sm/6 text-gray-600 dark:text-gray-300";

function InviteForm({
  hasName,
  state,
  formAction,
}: {
  hasName: boolean;
  state: ActionResult;
  formAction: (formData: FormData) => void;
}) {
  const { dashboard } = useMessages();
  const formRef = useRef<HTMLFormElement>(null);
  // Controlled, so React's form reset after a submission doesn't clear it. The
  // server renders it empty; the browser fills it in after hydration.
  const timeZone = useSyncExternalStore(subscribeNever, browserTimeZone, () => "");
  useFocusFirstError(formRef, state);

  if (!hasName) {
    return (
      <p className={statusTextClass}>
        {dashboard.welcome.nameRequired}{" "}
        <Link href="/profile" className={linkClass}>
          {dashboard.welcome.addName}
        </Link>
      </p>
    );
  }

  const error = state.fieldErrors?.email;
  return (
    <form ref={formRef} action={formAction} noValidate className="space-y-4 text-left">
      <FormAlert error={state.formError} notice={state.notice} />
      <input type="hidden" name="timeZone" value={timeZone} />
      <div className="flex gap-x-4">
        <label htmlFor="coparent-email" className="sr-only">
          {dashboard.welcome.emailLabel}
        </label>
        <input
          id="coparent-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder={dashboard.welcome.emailLabel}
          defaultValue={state.values?.email}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "coparent-email-error" : undefined}
          className={emailInputClass}
        />
        <SubmitButton
          label={dashboard.welcome.send}
          pendingLabel={dashboard.welcome.sending}
          className={buttonClass}
        />
      </div>
      {error ? (
        <p id="coparent-email-error" className={errorTextClass}>
          {error}
        </p>
      ) : null}
    </form>
  );
}

// `sendResult` carries the outcome of the send that created this invite (for
// example, the email failing) until the parent sends again.
function PendingInvite({
  sent,
  sendResult,
}: {
  sent: NonNullable<WelcomeData["sent"]>;
  sendResult: ActionResult;
}) {
  const { dashboard } = useMessages();
  const language = useLanguage();
  const [resendResult, formAction] = useActionState<ActionResult, FormData>(resendInvite, {});
  const state = resendResult.formError || resendResult.notice ? resendResult : sendResult;
  // Formatted in the invite's time zone so the server and browser agree.
  const date = new Intl.DateTimeFormat(language === "fr" ? "fr-CA" : "en-CA", {
    dateStyle: "long",
    timeZone: sent.timeZone,
  }).format(new Date(sent.expiresAt));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="inviteId" value={sent.id} />
      <p className={statusTextClass}>{fill(dashboard.welcome.pending, { email: sent.email, date })}</p>
      <div className="text-left">
        <FormAlert error={state.formError} notice={state.notice} />
      </div>
      <SubmitButton
        label={dashboard.welcome.sendAgain}
        pendingLabel={dashboard.welcome.sending}
        className={buttonClass}
      />
    </form>
  );
}

// The parent dashboard until their first co-parent accepts: the invite they
// sent or the form to send one, where the reference has its buttons. Invites
// are accepted by following the email link, so there's no accept step here;
// `inviteError` explains a link that couldn't be accepted.
export function ParentWelcome({
  welcome,
  inviteError,
}: {
  welcome: WelcomeData;
  inviteError?: string;
}) {
  const { dashboard } = useMessages();
  // Held here because a successful send swaps the form for the pending invite.
  const [sendResult, sendAction] = useActionState<ActionResult, FormData>(sendInvite, {});
  return (
    <section className="rounded-lg bg-white dark:bg-gray-900">
      <div className="px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-balance text-gray-900 sm:text-5xl dark:text-white">
            {dashboard.welcome.title}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg/8 text-pretty text-gray-600 dark:text-gray-300">
            {dashboard.welcome.description}
          </p>
          <div className="mx-auto mt-10 max-w-md space-y-10">
            {inviteError ? (
              <div className="text-left">
                <FormAlert error={inviteError} />
              </div>
            ) : null}
            {welcome.sent ? (
              <PendingInvite key={welcome.sent.id} sent={welcome.sent} sendResult={sendResult} />
            ) : (
              <InviteForm hasName={welcome.hasName} state={sendResult} formAction={sendAction} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
