import { type Messages } from "@tango/shared";
import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
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

// Shows the user's name, falling back to their email when no name is saved or
// the profile can't be read. Professionals get the professional dashboard;
// parents and accounts without a type get the parent dashboard. A failed read
// shows an error in the bare shell rather than guessing which one to show.
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

  const userName = profile?.name?.trim() || (claims.email ?? "");

  if (error) {
    console.error("[dashboard] profile load failed", { code: error.code, message: error.message });
    const { auth } = await requestMessages();
    return (
      <DashboardShell userName={userName} navigation={[]}>
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">
          {auth.errors.unexpected}
        </p>
      </DashboardShell>
    );
  }

  if (profile.account_type === "professional") {
    return <ProfessionalDashboard userName={userName} />;
  }

  const familyId = await loadFamilyId(supabase, claims.sub);
  const welcome =
    familyId === null
      ? await loadWelcome(supabase, claims.sub, Boolean(profile.name?.trim()))
      : undefined;
  if (familyId === "error" || welcome === "error") {
    const { auth } = await requestMessages();
    return (
      <DashboardShell userName={userName} navigation={[]}>
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">
          {auth.errors.unexpected}
        </p>
      </DashboardShell>
    );
  }
  const { invite } = await searchParams;
  const inviteError = welcome ? inviteMessage(invite, await requestMessages()) : undefined;
  return (
    <ParentDashboard
      userName={userName}
      familyId={familyId}
      welcome={welcome}
      inviteError={inviteError}
    />
  );
}

export default function DashboardPage({ searchParams }: PageProps<"/[lang]/dashboard">) {
  return (
    // The fallback is the bare shell, since the dashboard type isn't known yet.
    <Suspense fallback={<DashboardShell userName="" navigation={[]} />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}
