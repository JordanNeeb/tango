"use client";

import { useMessages } from "@/lib/i18n/language-provider";

import { ChatPanel } from "./chat-panel";
import { ConversationList } from "./conversation-list";
import { EmptyState } from "./empty-state";
import { useMessagesFrame } from "./messages-frame";
import { NewConversationForm } from "./new-conversation-form";
import { NoCoParentPrompt } from "./no-co-parent-prompt";
import { type ConversationDetail } from "./types";

// /messages: below `split` the list fills main; from it, the list is in the
// secondary column and main asks to pick a conversation. Without a family,
// the add-a-co-parent prompt.
export function ConversationsHome() {
  const { conversations: messages } = useMessages();
  const { family, welcome, names } = useMessagesFrame();
  if (!family) return welcome ? <NoCoParentPrompt welcome={welcome} /> : null;
  return (
    <>
      <div className="h-full overflow-y-auto overscroll-contain split:hidden">
        <ConversationList conversations={family.conversations} names={names} selectedId={null} />
      </div>
      <div className="hidden h-full split:block">
        <EmptyState title={messages.selectTitle} description={messages.selectDescription} />
      </div>
    </>
  );
}

export function OpenConversation({ conversation }: { conversation: ConversationDetail }) {
  const { names } = useMessagesFrame();
  return <ChatPanel key={conversation.id} conversation={conversation} names={names} />;
}

// Its route only renders for a parent with a family.
export function NewConversation() {
  const { family, names } = useMessagesFrame();
  if (!family) return null;
  return <NewConversationForm contacts={[{ familyId: family.familyId, name: names.coParent }]} />;
}
