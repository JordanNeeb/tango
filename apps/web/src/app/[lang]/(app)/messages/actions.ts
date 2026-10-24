"use server";

import { type Messages } from "@tango/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseAttachments } from "@/lib/attachments";
import { readText } from "@/lib/auth/validation";
import {
  cleanBody,
  cleanSubject,
  type ConversationActionResult,
  UUID,
  validateBody,
  validateSubject,
} from "@/lib/conversations";
import { requestMessages } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

// The messages layout and every page under it: the list in the layout shows
// each conversation's latest message, so a send or a new conversation changes it.
const MESSAGES_LAYOUT = "/[lang]/(app)/messages";

// Database functions raise a stable code as the message. Message text is never
// logged.
function failure(
  action: string,
  code: string | undefined,
  messages: Messages,
  values: ConversationActionResult["values"],
): ConversationActionResult {
  const errors = messages.conversations.errors;
  switch (code) {
    case "invalid_subject":
      return { fieldErrors: { subject: errors.subjectRequired }, values };
    case "invalid_body":
      return { fieldErrors: { body: errors.bodyRequired }, values };
    case "invalid_attachments":
      return { formError: errors.attachFailed, values };
    case "not_member":
      return { formError: errors.unavailable, values };
    default:
      console.error(`[messages] ${action} failed`, { code });
      return { formError: errors.sendFailed, values };
  }
}

async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/sign-in");
  return supabase;
}

// The browser has already uploaded the files; the form posts their storage
// paths and names, which the database checks against storage.
export async function startConversation(
  _previous: ConversationActionResult,
  formData: FormData,
): Promise<ConversationActionResult> {
  const messages = await requestMessages();
  const errors = messages.conversations.errors;
  const familyId = readText(formData, "familyId");
  const subject = cleanSubject(readText(formData, "subject"));
  const body = cleanBody(readText(formData, "body"));
  const attachments = parseAttachments(formData);
  const values = { subject, body };

  if (attachments === null) return failure("start", "invalid_attachments", messages, values);
  const subjectError = validateSubject(subject, errors);
  const bodyError = validateBody(body, errors, attachments.length > 0);
  if (subjectError || bodyError) {
    return { fieldErrors: { subject: subjectError, body: bodyError }, values };
  }
  if (!UUID.test(familyId)) return failure("start", "not_member", messages, values);

  const supabase = await signedInClient();
  const { data: conversationId, error } = await supabase.rpc("start_conversation", {
    target_family_id: familyId,
    conversation_subject: subject,
    message_body: body,
    attachments,
  });
  if (error || !conversationId) return failure("start", error?.message, messages, values);

  revalidatePath(MESSAGES_LAYOUT, "layout");
  redirect(`/messages/${conversationId}`);
}

export async function sendMessage(
  _previous: ConversationActionResult,
  formData: FormData,
): Promise<ConversationActionResult> {
  const messages = await requestMessages();
  const conversationId = readText(formData, "conversationId");
  const body = cleanBody(readText(formData, "body"));
  const attachments = parseAttachments(formData);
  const values = { body };

  if (attachments === null) return failure("send", "invalid_attachments", messages, values);
  const bodyError = validateBody(body, messages.conversations.errors, attachments.length > 0);
  if (bodyError) return { fieldErrors: { body: bodyError }, values };
  if (!UUID.test(conversationId)) return failure("send", "not_member", messages, values);

  const supabase = await signedInClient();
  const { error } = await supabase.rpc("send_message", {
    target_conversation_id: conversationId,
    message_body: body,
    attachments,
  });
  if (error) return failure("send", error.message, messages, values);

  revalidatePath(MESSAGES_LAYOUT, "layout");
  return { sentAt: Date.now() };
}
