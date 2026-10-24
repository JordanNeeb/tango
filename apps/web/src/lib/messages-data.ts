import "server-only";

import {
  type ConversationAttachment,
  type ConversationDetail,
  type ConversationSummary,
  type FamilyConversations,
  MESSAGE_STATUSES,
  type MessageStatus,
  type Sender,
} from "@/components/conversations/types";
import { attachmentKind } from "@/lib/attachments";
import { UUID } from "@/lib/conversations";
import { loadFamilyId } from "@/lib/families";
import { type createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type Failure = { code?: string; message: string };

// About 3.7 KB of uuids per request URL.
const UNREAD_BATCH = 100;

// Attachment links last an hour; a live refresh or reload signs new ones.
const SIGNED_URL_SECONDS = 60 * 60;

function logFailure(what: string, error: Failure) {
  console.error(`[messages] ${what} load failed`, { code: error.code, message: error.message });
}

// Loads a paired parent's conversation list for the messages layout: their
// earliest-joined family's conversations, newest activity first, each marked
// when it holds a co-parent message they haven't read, and the co-parent's
// name. Returns null when they have no family and "error" when a read fails.
export async function loadConversations(
  supabase: Supabase,
  userId: string,
): Promise<FamilyConversations | null | "error"> {
  const familyId = await loadFamilyId(supabase, userId);
  if (familyId === "error") return "error";
  if (familyId === null) return null;

  const sender = (id: string | null): Sender => (id === userId ? "me" : "coParent");

  const [coParent, previews, unread] = await Promise.all([
    supabase
      .from("family_members")
      .select("profiles(name)")
      .eq("family_id", familyId)
      .neq("user_id", userId)
      .limit(1),
    supabase
      .from("conversation_previews")
      .select(
        "id, subject, started_by, latest_message_id, latest_sender_id, latest_body, latest_created_at, latest_attachment_count",
      )
      .eq("family_id", familyId)
      .order("latest_created_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase.rpc("unread_messages", { target_family_id: familyId }),
  ]);
  if (coParent.error) {
    logFailure("co-parent", coParent.error);
    return "error";
  }
  if (previews.error) {
    logFailure("conversations", previews.error);
    return "error";
  }
  if (unread.error) {
    logFailure("unread", unread.error);
    return "error";
  }

  // The conversations holding the co-parent's messages this parent hasn't read.
  // The ids go in the request URL, so they're looked up in batches small
  // enough for the gateway (500 ids is past its URL length limit).
  const unreadConversations = new Set<string>();
  const unreadIds = unread.data.map((row) => row.id);
  const batches: string[][] = [];
  for (let start = 0; start < unreadIds.length; start += UNREAD_BATCH) {
    batches.push(unreadIds.slice(start, start + UNREAD_BATCH));
  }
  const lookups = await Promise.all(
    batches.map((ids) => supabase.from("messages").select("conversation_id").in("id", ids)),
  );
  for (const { data: unreadRows, error: unreadRowsError } of lookups) {
    if (unreadRowsError) {
      logFailure("unread conversations", unreadRowsError);
      return "error";
    }
    for (const row of unreadRows) unreadConversations.add(row.conversation_id);
  }

  const conversations: ConversationSummary[] = previews.data.flatMap((row) =>
    row.id && row.subject
      ? [
          {
            id: row.id,
            subject: row.subject,
            startedBy: sender(row.started_by),
            unread: unreadConversations.has(row.id),
            latest:
              row.latest_message_id && row.latest_body !== null && row.latest_created_at
                ? {
                    id: row.latest_message_id,
                    sender: sender(row.latest_sender_id),
                    body: row.latest_body,
                    createdAt: row.latest_created_at,
                    attachmentCount: row.latest_attachment_count ?? 0,
                  }
                : null,
          },
        ]
      : [],
  );

  return {
    familyId,
    coParentName: coParent.data[0]?.profiles?.name?.trim() || null,
    conversations,
  };
}

// Loads one conversation in the listed family: its messages oldest first and
// the co-parent's statuses for the parent's own latest message. Returns
// "not-found" for a malformed id or a conversation outside that family (RLS
// hides other families'), and "error" when a read fails.
export async function loadConversation(
  supabase: Supabase,
  userId: string,
  familyId: string,
  conversationId: string,
): Promise<ConversationDetail | "not-found" | "error"> {
  if (!UUID.test(conversationId)) return "not-found";

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select("id, family_id, subject, started_by")
    .eq("id", conversationId)
    .maybeSingle();
  if (error) {
    logFailure("conversation", error);
    return "error";
  }
  if (!conversation || conversation.family_id !== familyId) return "not-found";

  const sender = (id: string | null): Sender => (id === userId ? "me" : "coParent");

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", conversation.id)
    .order("seq", { ascending: true });
  if (messagesError) {
    logFailure("messages", messagesError);
    return "error";
  }

  // Only the parent's own latest message shows the co-parent's statuses.
  let latestSent: ConversationDetail["latestSent"] = null;
  const mine = messages.findLast((message) => message.sender_id === userId);
  if (mine) {
    const { data: receipts, error: receiptsError } = await supabase
      .from("message_receipts")
      .select("kind, created_at")
      .eq("message_id", mine.id);
    if (receiptsError) {
      logFailure("receipts", receiptsError);
      return "error";
    }
    const status: Partial<Record<MessageStatus, string>> = {};
    for (const receipt of receipts) {
      const kind = MESSAGE_STATUSES.find((known) => known === receipt.kind);
      if (kind) status[kind] = receipt.created_at;
    }
    latestSent = { id: mine.id, status };
  }

  const attachments = await loadAttachments(supabase, conversation.id);
  if (attachments === "error") return "error";

  return {
    id: conversation.id,
    familyId: conversation.family_id,
    subject: conversation.subject,
    startedBy: sender(conversation.started_by),
    messages: messages.map((message) => ({
      id: message.id,
      sender: sender(message.sender_id),
      body: message.body,
      createdAt: message.created_at,
      attachments: attachments.get(message.id) ?? [],
    })),
    latestSent,
  };
}

// A conversation's attachments by message, in upload order, with links signed
// for an hour: one to open each file and one that downloads it under its
// original name. A file that can't be signed keeps null links and is logged.
async function loadAttachments(
  supabase: Supabase,
  conversationId: string,
): Promise<Map<string, ConversationAttachment[]> | "error"> {
  const { data: rows, error } = await supabase
    .from("message_attachments")
    .select("id, message_id, storage_path, file_name, mime_type, size_bytes, position, messages!inner(conversation_id)")
    .eq("messages.conversation_id", conversationId)
    .order("position", { ascending: true });
  if (error) {
    logFailure("attachments", error);
    return "error";
  }

  const byMessage = new Map<string, ConversationAttachment[]>();
  if (rows.length === 0) return byMessage;

  const { data: signed, error: signError } = await supabase.storage
    .from("attachments")
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      SIGNED_URL_SECONDS,
    );
  if (signError) {
    logFailure("attachment links", signError);
    return "error";
  }
  const urls = new Map(
    signed.flatMap((link) => (link.path && !link.error ? [[link.path, link.signedUrl]] : [])),
  );
  if (urls.size < rows.length) {
    logFailure("attachment links", { message: `${rows.length - urls.size} not signed` });
  }

  for (const row of rows) {
    const url = urls.get(row.storage_path) ?? null;
    const list = byMessage.get(row.message_id) ?? [];
    list.push({
      id: row.id,
      name: row.file_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      kind: attachmentKind(row.mime_type),
      url,
      // Storage serves the file as a download under this name.
      downloadUrl: url && `${url}&download=${encodeURIComponent(row.file_name)}`,
    });
    byMessage.set(row.message_id, list);
  }
  return byMessage;
}
