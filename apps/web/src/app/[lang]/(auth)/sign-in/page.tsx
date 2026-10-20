import { type Messages } from "@tango/shared";
import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { FormAlert } from "@/components/auth/fields";
import { SignInForm } from "@/components/auth/sign-in-form";
import { linkClass } from "@/components/auth/styles";
import { pageMessages } from "@/lib/i18n/server";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/sign-in">): Promise<Metadata> {
  const { auth } = await pageMessages(params);
  return { title: auth.signIn.submit };
}

// Only a known error or notice code from the URL maps to a message; the URL
// never supplies text.
function urlErrors(auth: Messages["auth"]): Record<string, string> {
  return {
    "link-invalid": auth.errors.linkInvalid,
    "google-failed": auth.errors.googleFailed,
    "invite-unavailable": auth.errors.inviteUnavailable,
    "invite-expired": auth.errors.inviteExpired,
  };
}
function urlNotices(auth: Messages["auth"]): Record<string, string> {
  return {
    "password-updated": auth.notices.passwordUpdated,
  };
}

function known(map: Record<string, string>, code: string | string[] | undefined) {
  return typeof code === "string" && Object.hasOwn(map, code) ? map[code] : undefined;
}

async function LinkNotice({
  auth,
  searchParams,
}: {
  auth: Messages["auth"];
  searchParams: PageProps<"/[lang]/sign-in">["searchParams"];
}) {
  const { error, notice } = await searchParams;
  const errorMessage = known(urlErrors(auth), error);
  const noticeMessage = known(urlNotices(auth), notice);
  if (!errorMessage && !noticeMessage) return null;
  return <FormAlert error={errorMessage} notice={noticeMessage} />;
}

export default async function SignInPage({
  params,
  searchParams,
}: PageProps<"/[lang]/sign-in">) {
  const { auth } = await pageMessages(params);
  return (
    <AuthCard
      title={auth.signIn.title}
      footer={
        <>
          {auth.signIn.noAccount}{" "}
          <Link href="/get-started" className={linkClass}>
            {auth.signIn.createAccount}
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        <Suspense fallback={null}>
          <LinkNotice auth={auth} searchParams={searchParams} />
        </Suspense>
        <SignInForm />
      </div>
    </AuthCard>
  );
}
