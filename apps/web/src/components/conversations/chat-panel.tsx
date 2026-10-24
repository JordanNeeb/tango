"use client";

import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useOptimistic, useRef, useState } from "react";

import { sendMessage } from "@/app/[lang]/(app)/messages/actions";
import { useFocusFirstError } from "@/components/auth/use-focus-first-error";
import { type ConversationActionResult } from "@/lib/conversations";
import { useMessages } from "@/lib/i18n/language-provider";

import { ComposerField } from "./composer-field";
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

// A message as shown: one still being sent is shown at once, before the
// server has it.
type ShownMessage = ConversationMessage & { sending?: true };

// Consecutive messages from the same day, so each day gets one divider.
function groupByDay(messages: ShownMessage[], format: DateFormat) {
  const groups: { key: string; messages: ShownMessage[] }[] = [];
  for (const message of messages) {
    const key = format.dayKey(message.createdAt);
    const last = groups.at(-1);
    if (last && last.key === key) last.messages.push(message);
    else groups.push({ key, messages: [message] });
  }
  return groups;
}

// Under the viewer's latest sent message: the furthest status the co-parent
// has reached and its time. Nothing until it is delivered.
function MessageStatusLine({
  status,
  format,
}: {
  status: Partial<Record<MessageStatus, string>>;
  format: DateFormat;
}) {
  const labels = useMessages().conversations.status;
  const kind = MESSAGE_STATUSES.findLast((known) => status[known]);
  const at = kind ? status[kind] : undefined;
  if (!kind || !at) return null;
  return (
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
      <span className="sr-only">{labels.label}: </span>
      <time dateTime={at}>{labels[kind].replace("{time}", () => format.time(at))}</time>
    </p>
  );
}

function MessageBubble({
  message,
  names,
  format,
  status,
}: {
  message: ShownMessage;
  names: Record<Sender, string>;
  format: DateFormat;
  // Only for the viewer's latest sent message.
  status?: Partial<Record<MessageStatus, string>>;
}) {
  // Received messages show when they were sent; the viewer's own show only
  // the latest one's status, or "Sending" until the server has it.
  const sendingLabel = useMessages().conversations.sending;
  const mine = message.sender === "me";
  return (
    <li className={`flex ${mine ? "justify-end" : ""}`}>
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
        {mine ? (
          message.sending ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sendingLabel}</p>
          ) : status ? (
            <MessageStatusLine status={status} format={format} />
          ) : null
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

// Sends one message. The text leaves the composer at once and `onSend` shows
// it in the conversation while the action runs. React resets the form after
// each submission, so the text comes back from the result after an error.
// The action's page render can miss statuses the co-parent records while it
// runs, and refreshes from those receipts may land before it, so the page
// refreshes once more after each send.
function Composer({
  conversationId,
  onSend,
}: {
  conversationId: string;
  onSend: (body: string) => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [hasText, setHasText] = useState(false);
  const [state, formAction, pending] = useActionState<ConversationActionResult, FormData>(
    async (previous, formData) => {
      const body = String(formData.get("body") ?? "").trim();
      if (body) {
        onSend(body);
        formRef.current?.reset();
        setHasText(false);
      }
      const result = await sendMessage(previous, formData);
      setHasText(Boolean(result.values?.body));
      return result;
    },
    {},
  );
  useFocusFirstError(formRef, state);

  useEffect(() => {
    if (state.sentAt) router.refresh();
  }, [state.sentAt, router]);

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
      <ComposerField
        defaultValue={state.values?.body}
        error={state.fieldErrors?.body}
        pending={pending}
        canSend={hasText}
        onTextChange={setHasText}
      />
    </form>
  );
}

// The open conversation: header, messages grouped by day, your latest message's
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
  // Messages being sent show at the end until the server's list includes them.
  const [shown, addSending] = useOptimistic(
    conversation.messages as ShownMessage[],
    (list, message: ShownMessage) => [...list, message],
  );
  const showSending = (body: string) =>
    addSending({
      id: `sending:${crypto.randomUUID()}`,
      sender: "me",
      body,
      createdAt: new Date().toISOString(),
      sending: true,
    });
  const latestId = shown.at(-1)?.id;

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
          className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 split:hidden dark:text-gray-400 dark:hover:text-white"
        >
          <span className="sr-only">{messages.back}</span>
          <ChevronLeftIcon aria-hidden="true" className="size-6" />
        </Link>
        <InitialsAvatar name={names.coParent} />
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
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6 lg:px-8"
      >
        {groupByDay(shown, format).map((group) => (
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
                  status={
                    message.id === conversation.latestSent?.id
                      ? conversation.latestSent.status
                      : undefined
                  }
                />
              ))}
            </ol>
          </section>
        ))}
      </div>

      <Composer conversationId={conversation.id} onSend={showSending} />
    </div>
  );
}
