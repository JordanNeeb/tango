"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";
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
// Each row shows the co-parent, the subject in place of the name, and a
// preview of the latest message. The co-parent's latest messages are recorded
// as delivered when the list loads, and as previewed while it's on screen
// (the secondary column is display:none below the `split` breakpoint, so it
// doesn't count there).
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
          className="-m-2.5 rounded-md p-2.5 text-gray-500 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-indigo-600 dark:text-gray-400 dark:hover:text-white dark:focus-visible:outline-indigo-500"
        >
          <span className="sr-only">{messages.newConversation}</span>
          <PencilSquareIcon aria-hidden="true" className="size-5.5" />
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
                  // Every row has the 3px left border, so text lines up whether
                  // or not it's coloured.
                  className={`flex w-full gap-x-4 border-l-3 px-4 py-5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 sm:px-6 ${
                    selected
                      ? "border-transparent bg-gray-50 dark:bg-white/5"
                      : conversation.unread
                        ? "border-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:border-indigo-400 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/15"
                        : "border-transparent hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <InitialsAvatar name={names.coParent} />
                  <div className="min-w-0 flex-auto">
                    <div className="flex items-baseline justify-between gap-x-4">
                      <p className="truncate text-sm/6 font-semibold text-gray-900 dark:text-white">
                        {conversation.unread ? (
                          <span className="sr-only">{messages.unread}, </span>
                        ) : null}
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
                        {latest.sender === "me" ? (
                          <>
                            <span className="font-semibold text-gray-400 dark:text-gray-300">
                              {messages.youPrefix}
                            </span>{" "}
                          </>
                        ) : (
                          <span className="sr-only">{names[latest.sender]}: </span>
                        )}
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
