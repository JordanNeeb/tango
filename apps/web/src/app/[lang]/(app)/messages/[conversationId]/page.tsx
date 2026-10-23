import { type Metadata } from "next";
import { Suspense } from "react";

import { pageMessages } from "@/lib/i18n/server";

import { MessagesPage } from "../messages-page";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/messages/[conversationId]">): Promise<Metadata> {
  const { conversations } = await pageMessages(params);
  return { title: conversations.title };
}

async function Conversation({
  params,
}: {
  params: PageProps<"/[lang]/messages/[conversationId]">["params"];
}) {
  const { conversationId } = await params;
  return <MessagesPage mode="conversation" conversationId={conversationId} />;
}

export default function ConversationPage({ params }: PageProps<"/[lang]/messages/[conversationId]">) {
  return (
    <Suspense>
      <Conversation params={params} />
    </Suspense>
  );
}
