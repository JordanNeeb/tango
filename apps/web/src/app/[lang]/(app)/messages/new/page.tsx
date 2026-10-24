import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoadError } from "@/components/conversations/load-error";
import { NewConversation } from "@/components/conversations/messages-pages";
import { loadFamilyId } from "@/lib/families";
import { pageMessages, requestMessages } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/messages/new">): Promise<Metadata> {
  const { conversations } = await pageMessages(params);
  return { title: conversations.newConversation };
}

// A parent without a family has no one to message yet, so goes to /messages.
async function NewConversationRoute() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/sign-in");

  const familyId = await loadFamilyId(supabase, userId);
  if (familyId === "error") {
    return <LoadError message={(await requestMessages()).auth.errors.unexpected} />;
  }
  if (familyId === null) redirect("/messages");
  return <NewConversation />;
}

export default function NewConversationPage() {
  return (
    <Suspense>
      <NewConversationRoute />
    </Suspense>
  );
}
