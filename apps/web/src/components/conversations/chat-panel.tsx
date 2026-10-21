"use client";

import {
  ChevronLeftIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useId, useRef } from "react";

import { useMessages } from "@/lib/i18n/language-provider";

import { InitialsAvatar } from "./initials-avatar";
import {
  type Conversation,
  type ConversationMessage,
  type Sender,
} from "./sample-conversations";
import { useDateFormat } from "./use-date-format";

type DateFormat = ReturnType<typeof useDateFormat>;

// Consecutive messages from the same day, so each day gets one divider.
function groupByDay(messages: ConversationMessage[], format: DateFormat) {
  const groups: { key: string; messages: ConversationMessage[] }[] = [];
  for (const message of messages) {
    const key = format.dayKey(message.createdAt);
    const last = groups.at(-1);
    if (last && last.key === key) last.messages.push(message);
    else groups.push({ key, messages: [message] });
  }
  return groups;
}

function MessageBubble({
  message,
  names,
  format,
}: {
  message: ConversationMessage;
  names: Record<Sender, string>;
  format: DateFormat;
}) {
  const mine = message.sender === "me";
  return (
    <li className={`flex gap-x-3 ${mine ? "justify-end" : ""}`}>
      {mine ? null : <InitialsAvatar name={names[message.sender]} size="sm" />}
      <div
        className={`flex max-w-[75%] min-w-0 flex-col ${mine ? "items-end" : "items-start"}`}
      >
        <p
          className={`rounded-2xl px-4 py-2.5 text-sm/6 break-words whitespace-pre-wrap ${
            mine
              ? "rounded-br-md bg-indigo-600 text-white dark:bg-indigo-500"
              : "rounded-bl-md bg-gray-100 text-gray-900 dark:bg-white/5 dark:text-gray-200 dark:ring-1 dark:ring-white/10 dark:ring-inset"
          }`}
        >
          <span className="sr-only">{names[message.sender]}: </span>
          {message.body}
        </p>
        <time
          dateTime={message.createdAt}
          className="mt-1.5 text-xs text-gray-500"
        >
          {format.time(message.createdAt)}
        </time>
      </div>
    </li>
  );
}

// The open conversation: header, messages grouped by day, and the composer.
// Sending arrives in feature 6b, so the send button stays disabled.
export function ChatPanel({
  conversation,
  names,
  onBack,
}: {
  conversation: Conversation;
  names: Record<Sender, string>;
  onBack: () => void;
}) {
  const messages = useMessages().conversations;
  const format = useDateFormat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerId = useId();

  // The panel is keyed by conversation, so this runs each time one opens.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-x-4 border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-white/10">
        <button
          type="button"
          onClick={onBack}
          className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 xl:hidden dark:text-gray-400 dark:hover:text-white"
        >
          <span className="sr-only">{messages.back}</span>
          <ChevronLeftIcon aria-hidden="true" className="size-6" />
        </button>
        <InitialsAvatar name={names[conversation.startedBy]} />
        <div className="min-w-0">
          <h2 className="truncate text-base/7 font-semibold text-gray-900 dark:text-white">
            {conversation.subject}
          </h2>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
            {messages.startedBy.replace(
              "{name}",
              () => names[conversation.startedBy],
            )}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8"
      >
        {groupByDay(conversation.messages, format).map((group) => (
          <section key={group.key} className="mt-6 first:mt-0">
            <div className="flex items-center gap-x-4">
              <div
                aria-hidden="true"
                className="h-px flex-1 bg-gray-200 dark:bg-white/10"
              />
              <h3 className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200 ring-inset dark:bg-white/5 dark:text-gray-300 dark:ring-white/10">
                {format.day(group.messages[0].createdAt)}
              </h3>
              <div
                aria-hidden="true"
                className="h-px flex-1 bg-gray-200 dark:bg-white/10"
              />
            </div>
            <ol role="list" className="mt-6 space-y-6">
              {group.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  names={names}
                  format={format}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>

      <div className="flex items-end gap-x-3 border-t border-gray-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-white/10">
        <label htmlFor={composerId} className="sr-only">
          {messages.composerLabel}
        </label>
        <textarea
          id={composerId}
          rows={1}
          placeholder={messages.composerPlaceholder}
          className="block min-h-11 flex-1 resize-none rounded-3xl bg-white px-4 py-2.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500"
        />
        <button
          type="button"
          disabled
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500 dark:disabled:hover:bg-indigo-500"
        >
          <span className="sr-only">{messages.send}</span>
          <PaperAirplaneIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  );
}
