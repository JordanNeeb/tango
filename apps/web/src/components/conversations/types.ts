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
  // The recipient's first time for each status of the latest message.
  latestStatus: Partial<Record<MessageStatus, string>>;
};

// A paired parent's messages page data, loaded on the server.
export type FamilyMessages = {
  familyId: string;
  // Null when the co-parent hasn't saved a name.
  coParentName: string | null;
  conversations: ConversationSummary[];
  selected: ConversationDetail | null;
};
