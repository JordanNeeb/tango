import { type Messages } from "@tango/shared";
import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ParentDashboard } from "@/components/dashboard/parent-dashboard";
import { type WelcomeData } from "@/components/dashboard/parent-welcome";
import { ProfessionalDashboard } from "@/components/dashboard/professional-dashboard";
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

  const welcome = await loadWelcome(supabase, claims.sub, Boolean(profile.name?.trim()));
  if (welcome === "error") {
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
  return <ParentDashboard userName={userName} welcome={welcome} inviteError={inviteError} />;
}

// A parent without a family sees the welcome page, with the invite they sent if
// it's still pending. Returns undefined once they have a
// family.
async function loadWelcome(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  hasName: boolean,
): Promise<WelcomeData | undefined | "error"> {
  const { data: memberships, error: memberError } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .limit(1);
  if (memberError) {
    console.error("[dashboard] family load failed", { code: memberError.code, message: memberError.message });
    return "error";
  }
  if (memberships.length > 0) return undefined;

  const { data: sent, error: sentError } = await supabase
    .from("family_invites")
    .select("id, invited_email, expires_at, time_zone")
    .eq("invited_by", userId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  if (sentError) {
    console.error("[dashboard] invites load failed", { code: sentError.code, message: sentError.message });
    return "error";
  }

  const latest = sent[0];
  return {
    hasName,
    sent: latest
      ? {
          id: latest.id,
          email: latest.invited_email,
          expiresAt: latest.expires_at,
          timeZone: latest.time_zone,
        }
      : null,
  };
}

export default function DashboardPage({ searchParams }: PageProps<"/[lang]/dashboard">) {
  return (
    // The fallback is the bare shell, since the dashboard type isn't known yet.
    <Suspense fallback={<DashboardShell userName="" navigation={[]} />}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}
