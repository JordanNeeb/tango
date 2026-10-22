"use client";

import {
  ChevronLeftIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { sendMessage } from "@/app/[lang]/messages/actions";
import { errorTextClass } from "@/components/auth/styles";
import { useFocusFirstError } from "@/components/auth/use-focus-first-error";
import { type ConversationActionResult } from "@/lib/conversations";
import { useMessages } from "@/lib/i18n/language-provider";

import { InitialsAvatar } from "./initials-avatar";
import { recordStatus, useOnShown } from "./message-status";
import {
  type ConversationDetail,
  type ConversationMessage,
  MESSAGE_STATUSES,
  type MessageStatus,
  type Sender,
} from "./types";
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

// The latest message's status, shown to both parents: when it was sent, then
// each status the recipient has reached, in order.
function MessageStatusLine({
  sentAt,
  status,
  format,
}: {
  sentAt: string;
  status: Partial<Record<MessageStatus, string>>;
  format: DateFormat;
}) {
  const labels = useMessages().conversations.status;
  const recorded = [
    { kind: "sent" as const, at: sentAt },
    ...MESSAGE_STATUSES.flatMap((kind) => {
      const at = status[kind];
      return at ? [{ kind, at }] : [];
    }),
  ];
  return (
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
      <span className="sr-only">{labels.label}: </span>
      {recorded.map(({ kind, at }, index) => (
        <span key={kind}>
          {index > 0 ? <span aria-hidden="true"> · </span> : null}
          <time dateTime={at}>
            {labels[kind].replace("{time}", () => format.dateTime(at))}
          </time>
          {index < recorded.length - 1 ? <span className="sr-only">, </span> : null}
        </span>
      ))}
    </p>
  );
}

function MessageBubble({
  message,
  names,
  format,
  status,
}: {
  message: ConversationMessage;
  names: Record<Sender, string>;
  format: DateFormat;
  // Only for the latest message.
  status?: Partial<Record<MessageStatus, string>>;
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
        {status ? (
          <MessageStatusLine sentAt={message.createdAt} status={status} format={format} />
        ) : (
          <time
            dateTime={message.createdAt}
            className="mt-1.5 text-xs text-gray-500"
          >
            {format.time(message.createdAt)}
          </time>
        )}
      </div>
    </li>
  );
}

// Sends one message. React resets the form after each submission, so the text
// comes back from the result after an error; after a send it clears.
function Composer({ conversationId }: { conversationId: string }) {
  const messages = useMessages().conversations;
  const composerId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [hasText, setHasText] = useState(false);
  const [state, formAction, pending] = useActionState<ConversationActionResult, FormData>(
    async (previous, formData) => {
      const result = await sendMessage(previous, formData);
      setHasText(Boolean(result.values?.body));
      return result;
    },
    {},
  );
  useFocusFirstError(formRef, state);

  const error = state.fieldErrors?.body;
  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      className="border-t border-gray-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-white/10"
    >
      {state.formError ? (
        <p
          role="alert"
          className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300"
        >
          {state.formError}
        </p>
      ) : null}
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="flex items-end gap-x-3">
        <label htmlFor={composerId} className="sr-only">
          {messages.composerLabel}
        </label>
        <textarea
          id={composerId}
          name="body"
          rows={1}
          placeholder={messages.composerPlaceholder}
          defaultValue={state.values?.body}
          readOnly={pending}
          onChange={(event) => setHasText(event.target.value.trim() !== "")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${composerId}-error` : undefined}
          className="block min-h-11 flex-1 resize-none rounded-3xl bg-white px-4 py-2.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 aria-invalid:outline-red-500 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-indigo-500 dark:aria-invalid:outline-red-400"
        />
        <button
          type="submit"
          disabled={pending || !hasText}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500 dark:disabled:hover:bg-indigo-500"
        >
          <span className="sr-only">{pending ? messages.sending : messages.send}</span>
          <PaperAirplaneIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
      {error ? (
        <p id={`${composerId}-error`} className={errorTextClass}>
          {error}
        </p>
      ) : null}
    </form>
  );
}

// The open conversation: header, messages grouped by day, the latest message's
// status, and the composer. The co-parent's messages are recorded as delivered
// when they load, and as read while the conversation is open in a visible tab.
export function ChatPanel({
  conversation,
  names,
}: {
  conversation: ConversationDetail;
  names: Record<Sender, string>;
}) {
  const messages = useMessages().conversations;
  const format = useDateFormat();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const coParentIds = conversation.messages.flatMap((message) =>
    message.sender === "coParent" ? [message.id] : [],
  );
  const coParentKey = coParentIds.join(",");
  const latestId = conversation.messages.at(-1)?.id;

  useEffect(() => {
    if (coParentKey) recordStatus("delivered", coParentKey.split(","));
  }, [coParentKey]);

  useOnShown(panelRef, () => recordStatus("read", coParentIds), coParentKey);

  // The panel is keyed by conversation, so this runs when one opens and again
  // whenever a new message arrives.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [latestId]);

  return (
    <div ref={panelRef} className="flex h-full flex-col">
      <div className="flex items-center gap-x-4 border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-white/10">
        <Link
          href="/messages"
          className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 xl:hidden dark:text-gray-400 dark:hover:text-white"
        >
          <span className="sr-only">{messages.back}</span>
          <ChevronLeftIcon aria-hidden="true" className="size-6" />
        </Link>
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
                  status={message.id === latestId ? conversation.latestStatus : undefined}
                />
              ))}
            </ol>
          </section>
        ))}
      </div>

      <Composer conversationId={conversation.id} />
    </div>
  );
}
