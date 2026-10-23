import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { MessagesView, type MessagesMode } from "@/components/conversations/messages-view";
import { loadWelcome } from "@/lib/families";
import { requestMessages } from "@/lib/i18n/server";
import { loadFamilyMessages } from "@/lib/messages-data";
import { createClient } from "@/lib/supabase/server";

function LoadError({ message }: { message: string }) {
  return (
    <p className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">
      {message}
    </p>
  );
}

// Shared by the messages routes, inside the `(app)` layout's shell. Messages
// are for parents: professionals go back to their dashboard. A parent without
// a family sees a prompt to add a co-parent on /messages; its child routes
// send them there. A failed read shows an error, like the dashboard.
async function Messages({ mode, conversationId }: { mode: MessagesMode; conversationId?: string }) {
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
    return <LoadError message={(await requestMessages()).auth.errors.unexpected} />;
  }

  if (profile.account_type === "professional") redirect("/dashboard");

  const family = await loadFamilyMessages(supabase, claims.sub, conversationId);
  if (family === "not-found") notFound();
  if (family === "error") {
    return <LoadError message={(await requestMessages()).auth.errors.unexpected} />;
  }

  if (family === null) {
    if (mode !== "list") redirect("/messages");
    const welcome = await loadWelcome(supabase, claims.sub, Boolean(profile.name?.trim()));
    if (welcome === "error") {
      return <LoadError message={(await requestMessages()).auth.errors.unexpected} />;
    }
    return <MessagesView userName={userName} mode={mode} welcome={welcome} />;
  }

  return <MessagesView userName={userName} mode={mode} family={family} />;
}

export function MessagesPage({ mode, conversationId }: { mode: MessagesMode; conversationId?: string }) {
  return (
    <Suspense>
      <Messages mode={mode} conversationId={conversationId} />
    </Suspense>
  );
}
