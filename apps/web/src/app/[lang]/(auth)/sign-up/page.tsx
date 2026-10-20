import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { linkClass } from "@/components/auth/styles";
import { EMAIL_PATTERN, isAccountType } from "@/lib/auth/validation";
import { pageMessages } from "@/lib/i18n/server";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/sign-up">): Promise<Metadata> {
  const { auth } = await pageMessages(params);
  return { title: auth.signUp.submit };
}

// The proxy already sends visitors without a valid type to /get-started; this
// is the page's own check. An invite link adds `email`, which pre-fills the
// still-editable email field.
async function SignUpWithType({
  searchParams,
}: {
  searchParams: PageProps<"/[lang]/sign-up">["searchParams"];
}) {
  const { type, email } = await searchParams;
  if (!isAccountType(type)) redirect("/get-started");
  const defaultEmail =
    typeof email === "string" && email.length <= 254 && EMAIL_PATTERN.test(email) ? email : undefined;
  return <SignUpForm accountType={type} defaultEmail={defaultEmail} />;
}

export default async function SignUpPage({
  params,
  searchParams,
}: PageProps<"/[lang]/sign-up">) {
  const { auth } = await pageMessages(params);
  return (
    <AuthCard
      title={auth.signUp.title}
      footer={
        <>
          {auth.signUp.haveAccount}{" "}
          <Link href="/sign-in" className={linkClass}>
            {auth.signUp.signIn}
          </Link>
        </>
      }
    >
      <Suspense fallback={null}>
        <SignUpWithType searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}
