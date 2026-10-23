# Fix: Messages avatars and new message screen

**Type:** Fix
**Status:** verified
**Branch:** fix/messages-avatars-and-new-message-screen

## The problem

Messages UI details in `apps/web/src/components/conversations/`:

- `chat-panel.tsx` `MessageBubble` shows the sender's initials beside every
  co-parent bubble. In a two-person conversation, that adds nothing.
- The conversation header (`ChatPanel`) shows the initials of whoever started
  the conversation. Each row in `conversation-list.tsx` shows the latest
  sender's initials. In both places, the parent sometimes sees their own
  initials.
- The list's "New conversation" button is a text button with a plus icon.
- `new-conversation-form.tsx` is a stacked settings-style form (Subject,
  Message, Cancel, Start conversation), not a message screen.

## The fix

- **Bubbles:** remove the avatar from `MessageBubble`. Group chats don't exist
  yet; when they do, they can bring the avatar back for other senders. Keep the
  screen-reader sender name.
- **Initials show the other person:** the conversation header and every list row
  show the co-parent's initials (`names.coParent`), whoever started the
  conversation or sent last. The header's "Started by {name}" line and the
  rows' sender text for screen readers stay.
- **New conversation button:** an icon-only link with the Heroicons outline
  `PencilSquareIcon`. It keeps "New conversation" as its accessible name.
- **New message screen:** rebuild `NewConversationForm` to look like `ChatPanel`:
  - The header holds a **To:** field and a **Subject** field. The page opens with
    the cursor in To.
  - To and Subject look and behave like the dashboard header search: borderless
    inputs with grey placeholders ("To", "Subject") and accessible names, no
    visible labels or field borders. The shell's search is the reference, since
    Catalyst's inputs are bordered.
  - To completes inline from the parent's contacts. As they type, the rest of
    the first contact whose name starts with the text appears after the caret
    in grey (`aria-autocomplete="inline"`). Tab, or Arrow Right at the end of the
    text, accepts it. The recipient is the contact whose name matches the text
    exactly, ignoring case. No dropdown and no new dependency.
  - Contacts are the co-parents in the parent's families, each with that family's
    id. Today that is the single co-parent, named by `coParentName` with the
    existing fallback. The choice posts the contact's `familyId`, as the hidden
    field does now. `start_conversation` still enforces membership server-side
    (`not_member`), so nothing new is trusted.
  - The middle is the empty message area. The bottom is the regular composer
    (textarea plus round send button) and a back link like the chat header's.
  - Send stays disabled until To and Subject are filled. The message text is
    required too, as in the normal composer and the server's `bodyRequired`.
  - After an error, the subject and message come back, and the existing field
    errors show beside their fields.
- **Strings:** add `to` ("To" / "À") in English and French. Remove any string the new screen no longer uses, such as `start`,
  `starting` and `cancel`.
- No schema or action changes beyond reading the same `familyId`, `subject`
  and `body` form fields.

**Must not break:**
- starting a conversation (redirects to it), and the field and form errors
- message delivered, previewed and read recording in the list and the chat
- the multi-column layout below xl, where the list, chat and new screen replace
  each other, and their back links
- English and French, typecheck, lint, and build

## Build steps

- [x] **1. Avatars and the new-conversation icon**
  - Remove the bubble avatar. Show the co-parent's initials in the header and
    list rows. Make the new conversation link icon-only.
  - Done when: no bubble has initials; the header and every row show the
    co-parent's initials; the link is a pencil-square icon named "New
    conversation"; typecheck and lint pass.

- [x] **2. New message screen**
  - Pass contacts to the form. Rebuild the form as a message screen with To and
    Subject in the header, styled like the header search, and the composer at
    the bottom. To completes contact names inline.
  - Done when: `/messages/new` opens with focus in To; typing the start of a
    contact's name shows the rest in grey, and Tab or Arrow Right fills it in;
    Send stays disabled until To, Subject and message are filled;
    sending opens the new conversation; errors keep the typed values;
    typecheck, lint, and build pass.

- [x] **3. Simpler message status lines**
  - Messages you received show only their sent time. Your own messages show no
    "Sent" line. Only your latest sent message shows a status: its most recent
    one, in the order delivered, received, viewed (previewed), read, as the
    status and its time without a date (for example "Read 3:42 PM"). Nothing
    shows before it is delivered.
  - `loadFamilyMessages` loads receipts for the parent's latest sent message
    rather than the conversation's latest message. RLS already scopes them.
    "Previewed" reads "Viewed" ("Vu"), and the unused `sent` label is removed.
  - Done when: received bubbles show only a time; only your latest message
    shows one status with a time; typecheck, lint, and build pass.

- [x] **4. Messages breakpoints (rail at 600px, two columns at 1050px) and a smaller icon**
  - A `split` breakpoint (`--breakpoint-split: 65.625rem`, 1050px) in
    `globals.css` replaces `xl` (1280px) wherever the messages pages switch
    between one and two columns: the shell's secondary column and main
    padding, the list or empty state in main, and the chat and new message
    back links. The rail still appears at `lg`. The pencil-square icon is
    22px (`size-5.5`).
  - On the messages pages, the icon rail shows from 600px (a `rail`
    breakpoint, `37.5rem`) rather than `lg`. The content offset moves with it,
    and the menu button, its separator and the drawer show only below 600px.
    Pages with the full sidebar keep `lg`.
  - Done when: the built CSS has the `split` classes under
    `min-width: 65.625rem` and the `rail` classes under `min-width: 37.5rem`;
    lint, typecheck, and build pass.

## Verify

1. Run `npm run dev:web`, sign in as a parent with a co-parent, and open
   Messages.
2. Every row shows your co-parent's initials, including conversations you
   started or replied to last. Open one: the header shows their initials, and
   no bubble has initials.
3. The new conversation control is a pencil-square icon. Click it: the cursor
   is in To. Type the start of your co-parent's name: the rest appears in grey.
   Press Tab (or Arrow Right) to fill it in, then add a
   subject and a message. Send enables only once all three are filled. Send
   opens the conversation.
4. Clear the subject and try to send: Send is disabled. Switch to French and
   check the labels.
5. In a conversation, your co-parent's bubbles show only a time. Only your
   latest message shows a status, such as "Delivered 3:40 PM", and it moves to
   "Read 3:42 PM" when they open it.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7184,"specSha256":"56f316a1a1fda4dc141ec1c9e43c5d60d577d4f13c58252f1ed17339d2b0d275","branch":"refs/heads/fix/messages-avatars-and-new-message-screen","head":"09f2e794433ecf7638c38c62cf63456e1f6c8d4e","baseRef":"refs/heads/dev","baseCommit":"09f2e794433ecf7638c38c62cf63456e1f6c8d4e","sourceTree":"0cf812c061c043750fbe909b88291c27c5b86191","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Run `npm run dev:web`, sign in as a parent with a co-parent, and open
   Messages.
2. Every row and the conversation header show your co-parent's initials, and no
   bubble has initials.
3. Click the pencil-square icon. The cursor is in To. Type the start of your
   co-parent's name, press Tab or Arrow Right to fill it in, then add a subject
   and a message. Send enables only once all three are filled.
4. In a conversation, your co-parent's bubbles show only a time, and only your
   latest message shows a status such as "Read 3:42 PM".
5. Narrow the window: the list and chat split at 1050px, and the rail
   disappears below 600px, leaving the menu button.
