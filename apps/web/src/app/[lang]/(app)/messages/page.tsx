import { type Metadata } from "next";

import { pageMessages } from "@/lib/i18n/server";

import { MessagesPage } from "./messages-page";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/messages">): Promise<Metadata> {
  const { conversations } = await pageMessages(params);
  return { title: conversations.title };
}

export default function ConversationsPage() {
  return <MessagesPage mode="list" />;
}
