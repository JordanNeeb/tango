"use client";

import { useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { parentNavigation } from "@/components/dashboard/parent-navigation";
import { useMessages } from "@/lib/i18n/language-provider";

import { ChatPanel } from "./chat-panel";
import { ConversationList } from "./conversation-list";
import { EmptyState } from "./empty-state";
import { SAMPLE_CO_PARENT_NAME, SAMPLE_CONVERSATIONS } from "./sample-conversations";

// The parent's messages page in the multi-column shell. From xl the list sits
// in the secondary column beside the chat; below xl the secondary column is
// hidden, so main shows the list until a conversation is picked.
export function MessagesView({ userName }: { userName: string }) {
  const { dashboard, conversations: messages } = useMessages();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const conversations = SAMPLE_CONVERSATIONS;
  const names = { me: userName, coParent: SAMPLE_CO_PARENT_NAME };
  const selected = conversations.find((conversation) => conversation.id === selectedId);

  const list = (
    <ConversationList
      conversations={conversations}
      names={names}
      selectedId={selectedId}
      onSelect={setSelectedId}
    />
  );

  return (
    <DashboardShell
      userName={userName}
      navigation={parentNavigation(dashboard, "messages")}
      title={messages.title}
      aside={list}
    >
      <div className="h-[calc(100dvh-4rem)]">
        {selected ? (
          <ChatPanel
            key={selected.id}
            conversation={selected}
            names={names}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <>
            <div className="h-full overflow-y-auto xl:hidden">{list}</div>
            <div className="hidden h-full xl:block">
              <EmptyState title={messages.selectTitle} description={messages.selectDescription} />
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
