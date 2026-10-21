"use client";

import { useMessages } from "@/lib/i18n/language-provider";

import { EmptyState } from "./empty-state";
import { InitialsAvatar } from "./initials-avatar";
import { type Conversation, type Sender } from "./sample-conversations";
import { useDateFormat } from "./use-date-format";

// Ported from the Tailwind Plus narrow stacked list
// (design/references/tailwind-plus/application/narrow-stacked-list-dark.jsx).
// Each row shows the latest sender, the subject in place of the name, and a
// preview of the latest message.
export function ConversationList({
  conversations,
  names,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  names: Record<Sender, string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const messages = useMessages().conversations;
  const format = useDateFormat();

  if (conversations.length === 0) {
    return <EmptyState title={messages.emptyTitle} description={messages.emptyDescription} />;
  }

  return (
    <div>
      <h2 className="px-4 pt-6 pb-2 text-base/7 font-semibold text-white sm:px-6">
        {messages.heading}
      </h2>
      <ul role="list" className="divide-y divide-white/5">
        {conversations.map((conversation) => {
          const latest = conversation.messages.at(-1);
          const selected = conversation.id === selectedId;
          return (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                aria-current={selected ? "true" : undefined}
                className={`flex w-full gap-x-4 px-4 py-5 text-left hover:bg-white/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 sm:px-6 ${
                  selected ? "bg-white/5" : ""
                }`}
              >
                <InitialsAvatar name={latest ? names[latest.sender] : ""} />
                <div className="min-w-0 flex-auto">
                  <div className="flex items-baseline justify-between gap-x-4">
                    <p className="truncate text-sm/6 font-semibold text-white">
                      {conversation.subject}
                    </p>
                    {latest ? (
                      <p className="flex-none text-xs text-gray-400">
                        <time dateTime={latest.createdAt}>{format.listDate(latest.createdAt)}</time>
                      </p>
                    ) : null}
                  </div>
                  {latest ? (
                    <p className="mt-1 line-clamp-2 text-sm/6 break-words text-gray-400">
                      <span className="sr-only">{names[latest.sender]}: </span>
                      {latest.body}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
