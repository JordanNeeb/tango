import { type Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { ConversationSkeleton } from "@/components/conversations/conversation-skeleton";
import { LoadError } from "@/components/conversations/load-error";
import { OpenConversation } from "@/components/conversations/messages-pages";
import { loadFamilyId } from "@/lib/families";
import { pageMessages, requestMessages } from "@/lib/i18n/server";
import { loadConversation } from "@/lib/messages-data";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/messages/[conversationId]">): Promise<Metadata> {
  const { conversations } = await pageMessages(params);
  return { title: conversations.title };
}

// Loads only the open conversation; the list comes from the messages layout.
// A parent without a family goes to /messages, and a conversation outside
// their family is not found.
async function Conversation({
  params,
}: {
  params: PageProps<"/[lang]/messages/[conversationId]">["params"];
}) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (!userId) redirect("/sign-in");

  const familyId = await loadFamilyId(supabase, userId);
  if (familyId === "error") {
    return <LoadError message={(await requestMessages()).auth.errors.unexpected} />;
  }
  if (familyId === null) redirect("/messages");

  const conversation = await loadConversation(supabase, userId, familyId, conversationId);
  if (conversation === "not-found") notFound();
  if (conversation === "error") {
    return <LoadError message={(await requestMessages()).auth.errors.unexpected} />;
  }
  return <OpenConversation conversation={conversation} />;
}

export default function ConversationPage({ params }: PageProps<"/[lang]/messages/[conversationId]">) {
  return (
    <Suspense fallback={<ConversationSkeleton />}>
      <Conversation params={params} />
    </Suspense>
  );
}
