"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { useMessages } from "@/lib/i18n/language-provider";

import { EmptyState } from "./empty-state";
import { InitialsAvatar } from "./initials-avatar";
import { recordStatus, useOnShown } from "./message-status";
import { type ConversationSummary, type Sender } from "./types";
import { useDateFormat } from "./use-date-format";

// Ported from the Tailwind Plus narrow stacked list
// (design/references/tailwind-plus/application/narrow-stacked-list-dark.jsx).
// Each row shows the latest sender, the subject in place of the name, and a
// preview of the latest message. The co-parent's latest messages are recorded
// as delivered when the list loads, and as previewed while it's on screen
// (the secondary column is display:none below xl, so it doesn't count there).
export function ConversationList({
  conversations,
  names,
  selectedId,
}: {
  conversations: ConversationSummary[];
  names: Record<Sender, string>;
  selectedId: string | null;
}) {
  const messages = useMessages().conversations;
  const format = useDateFormat();
  const ref = useRef<HTMLDivElement>(null);

  const coParentLatest = conversations.flatMap((conversation) =>
    conversation.latest?.sender === "coParent" ? [conversation.latest.id] : [],
  );
  const latestKey = coParentLatest.join(",");

  useEffect(() => {
    if (latestKey) recordStatus("delivered", latestKey.split(","));
  }, [latestKey]);

  useOnShown(ref, () => recordStatus("previewed", coParentLatest), latestKey);

  return (
    <div ref={ref}>
      <div className="flex items-center justify-between gap-x-4 px-4 pt-6 pb-2 sm:px-6">
        <h2 className="text-base/7 font-semibold text-gray-900 dark:text-white">
          {messages.heading}
        </h2>
        <Link
          href="/messages/new"
          className="inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
        >
          <PlusIcon aria-hidden="true" className="-ml-0.5 size-5" />
          {messages.newConversation}
        </Link>
      </div>
      {conversations.length === 0 ? (
        <EmptyState title={messages.emptyTitle} description={messages.emptyDescription} />
      ) : (
        <ul role="list" className="divide-y divide-gray-100 dark:divide-white/5">
          {conversations.map((conversation) => {
            const latest = conversation.latest;
            const selected = conversation.id === selectedId;
            return (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  aria-current={selected ? "true" : undefined}
                  className={`flex w-full gap-x-4 px-4 py-5 text-left hover:bg-gray-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 sm:px-6 dark:hover:bg-white/5 ${
                    selected ? "bg-gray-50 dark:bg-white/5" : ""
                  }`}
                >
                  <InitialsAvatar name={latest ? names[latest.sender] : ""} />
                  <div className="min-w-0 flex-auto">
                    <div className="flex items-baseline justify-between gap-x-4">
                      <p className="truncate text-sm/6 font-semibold text-gray-900 dark:text-white">
                        {conversation.subject}
                      </p>
                      {latest ? (
                        <p className="flex-none text-xs text-gray-600 dark:text-gray-400">
                          <time dateTime={latest.createdAt}>
                            {format.listDate(latest.createdAt)}
                          </time>
                        </p>
                      ) : null}
                    </div>
                    {latest ? (
                      <p className="mt-1 line-clamp-2 text-sm/6 break-words text-gray-600 dark:text-gray-400">
                        <span className="sr-only">{names[latest.sender]}: </span>
                        {latest.body}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
