"use client";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { parentNavigation } from "@/components/dashboard/parent-navigation";
import { type WelcomeData } from "@/components/dashboard/parent-welcome";
import { useMessages } from "@/lib/i18n/language-provider";

import { ChatPanel } from "./chat-panel";
import { ConversationList } from "./conversation-list";
import { EmptyState } from "./empty-state";
import { NewConversationForm } from "./new-conversation-form";
import { NoCoParentPrompt } from "./no-co-parent-prompt";
import { type FamilyMessages } from "./types";
import { useMessagesActivity } from "./use-messages-activity";

export type MessagesMode = "list" | "conversation" | "new";

// The parent's messages pages in the multi-column shell. From xl the list sits
// in the secondary column beside the chat; below xl the secondary column is
// hidden, so /messages shows the list in main and a conversation or the new
// conversation form replaces it. Without a family, the page keeps that layout
// and prompts the parent to add a co-parent from their dashboard.
export function MessagesView({
  userName,
  mode,
  family,
  welcome,
}: {
  userName: string;
  mode: MessagesMode;
  family?: FamilyMessages;
  welcome?: WelcomeData;
}) {
  const { dashboard, conversations: messages } = useMessages();
  const unread = useMessagesActivity(family?.familyId ?? null, { refresh: true });
  const navigation = parentNavigation(dashboard, "messages", unread);

  if (!family) {
    // The same layout as with a family, with nothing to list and a prompt to
    // add a co-parent in place of the chat.
    const emptyList = (
      <div>
        <h2 className="px-4 pt-6 pb-2 text-base/7 font-semibold text-gray-900 sm:px-6 dark:text-white">
          {messages.heading}
        </h2>
        <EmptyState title={messages.emptyTitle} description={messages.emptyDescription} />
      </div>
    );
    return (
      <DashboardShell
        userName={userName}
        navigation={navigation}
        title={messages.title}
        aside={emptyList}
      >
        <div className="h-[calc(100dvh-4rem)]">
          {welcome ? <NoCoParentPrompt welcome={welcome} /> : null}
        </div>
      </DashboardShell>
    );
  }

  const names = {
    me: userName,
    coParent: family.coParentName ?? messages.coParentFallback,
  };
  const selected = mode === "conversation" ? family.selected : null;

  const list = (
    <ConversationList
      conversations={family.conversations}
      names={names}
      selectedId={selected?.id ?? null}
    />
  );

  let content;
  if (selected) {
    content = <ChatPanel key={selected.id} conversation={selected} names={names} />;
  } else if (mode === "new") {
    content = <NewConversationForm familyId={family.familyId} />;
  } else {
    content = (
      <>
        <div className="h-full overflow-y-auto xl:hidden">{list}</div>
        <div className="hidden h-full xl:block">
          <EmptyState title={messages.selectTitle} description={messages.selectDescription} />
        </div>
      </>
    );
  }

  return (
    <DashboardShell userName={userName} navigation={navigation} title={messages.title} aside={list}>
      <div className="h-[calc(100dvh-4rem)]">{content}</div>
    </DashboardShell>
  );
}
