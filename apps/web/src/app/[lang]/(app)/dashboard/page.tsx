import { type Messages } from "@tango/shared";
import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { ProfessionalDashboard } from "@/components/dashboard/professional-dashboard";
import { loadFamilyId, loadWelcome } from "@/lib/families";
import { pageMessages, requestMessages } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/dashboard">): Promise<Metadata> {
  const { dashboard } = await pageMessages(params);
  return { title: dashboard.title };
}

// Explains a failed accept after an invite link (codes from the database, set
// by the link and sign-in routes). Unknown codes show nothing.
function inviteMessage(code: unknown, messages: Messages): string | undefined {
  switch (code) {
    case "invite_unavailable":
      return messages.invite.errors.unavailable;
    case "email_mismatch":
      return messages.invite.errors.emailMismatch;
    case "self_invite":
      return messages.invite.errors.ownInvite;
    case "unexpected":
      return messages.auth.errors.unexpected;
    default:
      return undefined;
  }
}

function LoadError({ message }: { message: string }) {
  return (
    <p className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">
      {message}
    </p>
  );
}

// The shell comes from the `(app)` layout. Professionals get the professional
// dashboard, greeted by name (or email when no name is saved); parents and
// accounts without a type get the parent dashboard. A failed read shows an
// error rather than guessing which one to show.
async function Dashboard({
  searchParams,
}: {
  searchParams: PageProps<"/[lang]/dashboard">["searchParams"];
}) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/sign-in");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("name, account_type")
    .eq("id", claims.sub)
    .single();

  if (error) {
    console.error("[dashboard] profile load failed", { code: error.code, message: error.message });
    return <LoadError message={(await requestMessages()).auth.errors.unexpected} />;
  }

  if (profile.account_type === "professional") {
    return <ProfessionalDashboard userName={profile.name?.trim() || (claims.email ?? "")} />;
  }

  const familyId = await loadFamilyId(supabase, claims.sub);
  const welcome =
    familyId === null
      ? await loadWelcome(supabase, claims.sub, Boolean(profile.name?.trim()))
      : undefined;
  if (familyId === "error" || welcome === "error") {
    return <LoadError message={(await requestMessages()).auth.errors.unexpected} />;
  }
  const { invite } = await searchParams;
  const inviteError = welcome ? inviteMessage(invite, await requestMessages()) : undefined;
  return <ParentDashboard welcome={welcome} inviteError={inviteError} />;
}

export default function DashboardPage({ searchParams }: PageProps<"/[lang]/dashboard">) {
  return (
    <Suspense>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}
