import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { LoadError } from "@/components/conversations/load-error";
import { MessagesFrame } from "@/components/conversations/messages-frame";
import { loadWelcome } from "@/lib/families";
import { requestMessages } from "@/lib/i18n/server";
import { loadConversations } from "@/lib/messages-data";
import { createClient } from "@/lib/supabase/server";

// Loads what every messages page shares, once: the parent's conversation list
// (with unread) and co-parent's name, or the welcome data without a family.
// Messages are for parents: professionals go back to their dashboard. A
// failed read shows an error in place of the pages.
async function Messages({ children }: { children: ReactNode }) {
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
    console.error("[messages] profile load failed", { code: error.code, message: error.message });
    return <LoadError message={(await requestMessages()).auth.errors.unexpected} />;
  }
  if (profile.account_type === "professional") redirect("/dashboard");

  const userName = profile.name?.trim() || (claims.email ?? "");
  const family = await loadConversations(supabase, claims.sub);
  if (family === "error") {
    return <LoadError message={(await requestMessages()).auth.errors.unexpected} />;
  }

  if (family === null) {
    const welcome = await loadWelcome(supabase, claims.sub, Boolean(profile.name?.trim()));
    if (welcome === "error") {
      return <LoadError message={(await requestMessages()).auth.errors.unexpected} />;
    }
    return (
      <MessagesFrame userName={userName} family={null} welcome={welcome}>
        {children}
      </MessagesFrame>
    );
  }

  return (
    <MessagesFrame userName={userName} family={family}>
      {children}
    </MessagesFrame>
  );
}

export default function MessagesLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <Messages>{children}</Messages>
    </Suspense>
  );
}
