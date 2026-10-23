"use client";

import { type WelcomeData } from "@/components/dashboard/parent-welcome";
import { ShellPage } from "@/components/dashboard/ui-context";
import { useMessages } from "@/lib/i18n/language-provider";

import { ChatPanel } from "./chat-panel";
import { ConversationList } from "./conversation-list";
import { EmptyState } from "./empty-state";
import { NewConversationForm } from "./new-conversation-form";
import { NoCoParentPrompt } from "./no-co-parent-prompt";
import { type FamilyMessages } from "./types";

export type MessagesMode = "list" | "conversation" | "new";

// The parent's messages pages in the multi-column shell. From 1050px (the
// `split` breakpoint) the list sits in the secondary column beside the chat;
// below it the secondary column is hidden, so /messages shows the list in main
// and a conversation or the new conversation form replaces it. Without a family there is nothing to list, so
// the page uses the full sidebar and one section offering an invite or Solo.
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
  const { conversations: messages } = useMessages();

  if (!family) {
    return (
      <ShellPage title={messages.title}>
        {welcome ? <NoCoParentPrompt welcome={welcome} /> : null}
      </ShellPage>
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
    content = (
      <NewConversationForm contacts={[{ familyId: family.familyId, name: names.coParent }]} />
    );
  } else {
    content = (
      <>
        <div className="h-full overflow-y-auto split:hidden">{list}</div>
        <div className="hidden h-full split:block">
          <EmptyState title={messages.selectTitle} description={messages.selectDescription} />
        </div>
      </>
    );
  }

  return (
    <ShellPage title={messages.title} aside={list}>
      <div className="h-[calc(100dvh-4rem)]">{content}</div>
    </ShellPage>
  );
}
