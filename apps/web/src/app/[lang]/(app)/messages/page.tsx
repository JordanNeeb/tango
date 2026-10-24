import { type Metadata } from "next";

import { ConversationsHome } from "@/components/conversations/messages-pages";
import { pageMessages } from "@/lib/i18n/server";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/messages">): Promise<Metadata> {
  const { conversations } = await pageMessages(params);
  return { title: conversations.title };
}

export default function ConversationsPage() {
  return <ConversationsHome />;
}
