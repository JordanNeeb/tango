// Placeholder conversations for reviewing the messages layout. They stand in
// for what parents write, so they aren't translated. Feature 6b replaces them
// with real, append-only conversations.

export type Sender = "me" | "coParent";

export type ConversationMessage = {
  id: string;
  sender: Sender;
  body: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  subject: string;
  startedBy: Sender;
  messages: ConversationMessage[];
};

export const SAMPLE_CO_PARENT_NAME = "Alex Martin";

// Newest conversation first; messages oldest first.
export const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    subject: "Friday pickup time",
    startedBy: "coParent",
    messages: [
      {
        id: "m1",
        sender: "coParent",
        body: "Can we move Friday's pickup to 5:30? My shift ends later that day.",
        createdAt: "2026-10-18T21:04:00Z",
      },
      {
        id: "m2",
        sender: "me",
        body: "5:30 works. I'll bring Maya's soccer bag too.",
        createdAt: "2026-10-18T21:20:00Z",
      },
      {
        id: "m3",
        sender: "coParent",
        body: "Thanks. Same spot as usual?",
        createdAt: "2026-10-20T14:12:00Z",
      },
      {
        id: "m4",
        sender: "me",
        body: "Yes, the school parking lot.\nText me if traffic is bad.",
        createdAt: "2026-10-20T14:31:00Z",
      },
    ],
  },
  {
    id: "c2",
    subject: "Dentist appointment",
    startedBy: "me",
    messages: [
      {
        id: "m5",
        sender: "me",
        body: "Maya's cleaning is booked for November 4 at 3:15. Can you take her? I have a meeting.",
        createdAt: "2026-10-16T16:45:00Z",
      },
      {
        id: "m6",
        sender: "coParent",
        body: "I can. Please send me the clinic's address.",
        createdAt: "2026-10-16T18:02:00Z",
      },
      {
        id: "m7",
        sender: "me",
        body: "1200 Bay Street, suite 400. They'll have the paperwork ready.",
        createdAt: "2026-10-17T12:10:00Z",
      },
    ],
  },
  {
    id: "c3",
    subject: "Winter coat",
    startedBy: "coParent",
    messages: [
      {
        id: "m8",
        sender: "coParent",
        body: "Maya has outgrown her winter coat. I found one on sale for $90. Should we split it?",
        createdAt: "2026-10-12T19:30:00Z",
      },
      {
        id: "m9",
        sender: "me",
        body: "Sounds good, go ahead.",
        createdAt: "2026-10-12T20:05:00Z",
      },
    ],
  },
];
