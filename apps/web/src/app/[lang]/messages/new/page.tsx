import { type Metadata } from "next";

import { pageMessages } from "@/lib/i18n/server";

import { MessagesPage } from "../messages-page";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/messages/new">): Promise<Metadata> {
  const { conversations } = await pageMessages(params);
  return { title: conversations.newConversation };
}

export default function NewConversationPage() {
  return <MessagesPage mode="new" />;
}
