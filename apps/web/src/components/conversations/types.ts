import { type AttachmentKind } from "@/lib/attachments";

// Messages are shown from the viewer's side: their own, or the co-parent's.
export type Sender = "me" | "coParent";

// The receiving parent's statuses that web pages record and show, in order.
// Sent is the message's own time; replied is saved by the database only.
export type MessageStatus = "delivered" | "received" | "previewed" | "read";

export const MESSAGE_STATUSES: MessageStatus[] = ["delivered", "received", "previewed", "read"];

// A file on a message, with signed links that expire after an hour. The links
// are null while it's still sending, or when one couldn't be signed.
export type ConversationAttachment = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  kind: AttachmentKind;
  url: string | null;
  downloadUrl: string | null;
};

export type ConversationMessage = {
  id: string;
  sender: Sender;
  // Empty when the message is only attachments.
  body: string;
  createdAt: string;
  // In upload order.
  attachments: ConversationAttachment[];
};

export type ConversationSummary = {
  id: string;
  subject: string;
  startedBy: Sender;
  // Has a message from the co-parent this parent hasn't read.
  unread: boolean;
  latest: (Omit<ConversationMessage, "attachments"> & { attachmentCount: number }) | null;
};

export type ConversationDetail = {
  id: string;
  // Where its attachments are uploaded.
  familyId: string;
  subject: string;
  startedBy: Sender;
  // Oldest first.
  messages: ConversationMessage[];
  // The viewer's latest sent message and the co-parent's time for each status
  // it has reached. Null until the viewer has sent one.
  latestSent: { id: string; status: Partial<Record<MessageStatus, string>> } | null;
};

// Someone a parent can start a conversation with: a co-parent, through the
// family they share.
export type Contact = {
  familyId: string;
  name: string;
};

// What every messages page of a paired parent shares, loaded once by the
// messages layout.
export type FamilyConversations = {
  familyId: string;
  // Null when the co-parent hasn't saved a name.
  coParentName: string | null;
  conversations: ConversationSummary[];
};
