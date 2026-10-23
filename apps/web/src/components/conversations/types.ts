// Messages are shown from the viewer's side: their own, or the co-parent's.
export type Sender = "me" | "coParent";

// The receiving parent's statuses that web pages record and show, in order.
// Sent is the message's own time; replied is saved by the database only.
export type MessageStatus = "delivered" | "received" | "previewed" | "read";

export const MESSAGE_STATUSES: MessageStatus[] = ["delivered", "received", "previewed", "read"];

export type ConversationMessage = {
  id: string;
  sender: Sender;
  body: string;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  subject: string;
  startedBy: Sender;
  latest: ConversationMessage | null;
};

export type ConversationDetail = {
  id: string;
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

// A paired parent's messages page data, loaded on the server.
export type FamilyMessages = {
  familyId: string;
  // Null when the co-parent hasn't saved a name.
  coParentName: string | null;
  conversations: ConversationSummary[];
  selected: ConversationDetail | null;
};
