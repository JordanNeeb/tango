import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { MessagesView } from "@/components/conversations/messages-view";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { pageMessages, requestMessages } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/messages">): Promise<Metadata> {
  const { conversations } = await pageMessages(params);
  return { title: conversations.title };
}

// Messages are for parents: professionals go back to their dashboard. A failed
// profile read shows an error in the bare shell, like the dashboard.
async function Messages() {
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
    console.error("[messages] profile load failed", { code: error.code, message: error.message });
    const { auth } = await requestMessages();
    return (
      <DashboardShell userName={userName} navigation={[]}>
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">
          {auth.errors.unexpected}
        </p>
      </DashboardShell>
    );
  }

  if (profile.account_type === "professional") redirect("/dashboard");

  return <MessagesView userName={userName} />;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<DashboardShell userName="" navigation={[]} aside={<div />} />}>
      <Messages />
    </Suspense>
  );
}
