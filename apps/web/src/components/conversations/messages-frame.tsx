"use client";

import { useParams } from "next/navigation";
import { createContext, type ReactNode, useContext } from "react";

import { type WelcomeData } from "@/components/dashboard/parent-welcome";
import { ShellPage } from "@/components/dashboard/ui-context";
import { useMessages } from "@/lib/i18n/language-provider";

import { ConversationList } from "./conversation-list";
import { type FamilyConversations, type Sender } from "./types";

type MessagesFrameValue = {
  // Null when the parent has no family yet; `welcome` is then set.
  family: FamilyConversations | null;
  welcome?: WelcomeData;
  names: Record<Sender, string>;
};

const MessagesFrameContext = createContext<MessagesFrameValue | null>(null);

// The messages pages' shared data, from the messages layout.
export function useMessagesFrame(): MessagesFrameValue {
  const value = useContext(MessagesFrameContext);
  if (!value) throw new Error("useMessagesFrame must be used inside MessagesFrame");
  return value;
}

// Kept by the messages layout while the pages inside it change, so the
// conversation list in the shell's secondary column stays mounted (and keeps
// its scroll) when another conversation opens. The open one comes from the
// route. From 1050px (the `split` breakpoint) the list sits beside the page;
// below it the column is hidden and /messages shows the list in main. Without
// a family there is nothing to list, so the pages use the full sidebar.
export function MessagesFrame({
  userName,
  family,
  welcome,
  children,
}: {
  userName: string;
  family: FamilyConversations | null;
  welcome?: WelcomeData;
  children: ReactNode;
}) {
  const { conversations: messages } = useMessages();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const names = {
    me: userName,
    coParent: family?.coParentName ?? messages.coParentFallback,
  };

  return (
    <MessagesFrameContext value={{ family, welcome, names }}>
      {family ? (
        <ShellPage
          title={messages.title}
          aside={
            <ConversationList
              conversations={family.conversations}
              names={names}
              selectedId={conversationId ?? null}
            />
          }
        >
          <div className="h-full">{children}</div>
        </ShellPage>
      ) : (
        <ShellPage title={messages.title}>{children}</ShellPage>
      )}
    </MessagesFrameContext>
  );
}
