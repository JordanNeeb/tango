import "server-only";

import {
  type ConversationSummary,
  type FamilyMessages,
  MESSAGE_STATUSES,
  type MessageStatus,
  type Sender,
} from "@/components/conversations/types";
import { UUID } from "@/lib/conversations";
import { loadFamilyId } from "@/lib/families";
import { type createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type Failure = { code?: string; message: string };

function logFailure(what: string, error: Failure) {
  console.error(`[messages] ${what} load failed`, { code: error.code, message: error.message });
}

// Loads a paired parent's conversations, and the selected one when an id is
// given. The family is the selected conversation's, or the parent's
// earliest-joined one. Returns null when they have no family, "not-found" for
// a conversation they can't read, and "error" when a read fails.
export async function loadFamilyMessages(
  supabase: Supabase,
  userId: string,
  conversationId?: string,
): Promise<FamilyMessages | null | "not-found" | "error"> {
  let conversation: {
    id: string;
    family_id: string;
    subject: string;
    started_by: string;
  } | null = null;

  if (conversationId !== undefined) {
    const { data, error } = UUID.test(conversationId)
      ? await supabase
          .from("conversations")
          .select("id, family_id, subject, started_by")
          .eq("id", conversationId)
          .maybeSingle()
      : { data: null, error: null };
    if (error) {
      logFailure("conversation", error);
      return "error";
    }
    if (!data) {
      // A parent without a family is sent to the add-a-co-parent prompt rather
      // than the not-found page.
      const familyId = await loadFamilyId(supabase, userId);
      if (familyId === "error") return "error";
      return familyId === null ? null : "not-found";
    }
    conversation = data;
  }

  const familyId = conversation?.family_id ?? (await loadFamilyId(supabase, userId));
  if (familyId === "error") return "error";
  if (familyId === null) return null;

  const sender = (id: string | null): Sender => (id === userId ? "me" : "coParent");

  const [coParent, previews] = await Promise.all([
    supabase
      .from("family_members")
      .select("profiles(name)")
      .eq("family_id", familyId)
      .neq("user_id", userId)
      .limit(1),
    supabase
      .from("conversation_previews")
      .select("id, subject, started_by, latest_message_id, latest_sender_id, latest_body, latest_created_at")
      .eq("family_id", familyId)
      .order("latest_created_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);
  if (coParent.error) {
    logFailure("co-parent", coParent.error);
    return "error";
  }
  if (previews.error) {
    logFailure("conversations", previews.error);
    return "error";
  }

  const conversations: ConversationSummary[] = previews.data.flatMap((row) =>
    row.id && row.subject
      ? [
          {
            id: row.id,
            subject: row.subject,
            startedBy: sender(row.started_by),
            latest:
              row.latest_message_id && row.latest_body !== null && row.latest_created_at
                ? {
                    id: row.latest_message_id,
                    sender: sender(row.latest_sender_id),
                    body: row.latest_body,
                    createdAt: row.latest_created_at,
                  }
                : null,
          },
        ]
      : [],
  );

  const result: FamilyMessages = {
    familyId,
    coParentName: coParent.data[0]?.profiles?.name?.trim() || null,
    conversations,
    selected: null,
  };
  if (!conversation) return result;

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", conversation.id)
    .order("seq", { ascending: true });
  if (messagesError) {
    logFailure("messages", messagesError);
    return "error";
  }

  const latestStatus: Partial<Record<MessageStatus, string>> = {};
  const latest = messages.at(-1);
  if (latest) {
    const { data: receipts, error: receiptsError } = await supabase
      .from("message_receipts")
      .select("kind, created_at")
      .eq("message_id", latest.id);
    if (receiptsError) {
      logFailure("receipts", receiptsError);
      return "error";
    }
    for (const receipt of receipts) {
      const kind = MESSAGE_STATUSES.find((status) => status === receipt.kind);
      if (kind) latestStatus[kind] = receipt.created_at;
    }
  }

  result.selected = {
    id: conversation.id,
    subject: conversation.subject,
    startedBy: sender(conversation.started_by),
    messages: messages.map((message) => ({
      id: message.id,
      sender: sender(message.sender_id),
      body: message.body,
      createdAt: message.created_at,
    })),
    latestStatus,
  };
  return result;
}
