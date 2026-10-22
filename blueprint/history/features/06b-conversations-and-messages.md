# Feature: Conversations and messages

**From build-plan:** feature 6b
**Build attempt:** 1
**Branch:** feature/conversations-and-messages
**Status:** verified

## Goal

Replace 6a's placeholder conversations with real, permanent data that updates
live. A paired parent can start a conversation with a subject and a first
message, read every conversation in their family, and reply.

Each message keeps its **message status**: the server time it was sent, and
the first time the other parent's app:

- delivered it
- alerted them to it (received)
- previewed it in the list
- had its conversation opened (read)

It also keeps the first time the other parent replied after it.

All of these are kept for court exports. The latest message shows its status to
both parents, except replied, which is kept in the database only. Nothing is ever edited or deleted. A parent without a family can
still open Messages, and is prompted to invite a co-parent.

## In scope

- **Schema (append-only).**
  - `conversations(id, family_id, subject, started_by, created_at)`
  - `messages(id, family_id, conversation_id, sender_id, body, created_at, seq)`
  - `message_receipts(id, family_id, message_id, reader_id, kind, created_at)`,
    where `kind` is `delivered`, `received`, `previewed`, `read`, or `replied`. There's one row per
    message, reader, and kind: the first time only.
  - RLS lets only family members read them. Clients can't insert, update, or
    delete.
  - Triggers reject `UPDATE`, `DELETE`, and `TRUNCATE` from every role,
    including the service role.
- **Write path.** `security definer` functions take the actor from
  `auth.uid()`:
  - `start_conversation(family_id, subject, body)` creates the conversation and
    its first message in one transaction.
  - `send_message(conversation_id, body)` appends a message. Its `family_id`
    comes from the conversation.
  - `record_message_receipts(kind, message_ids)` records the caller's
    statuses, using the server time:
    - It records only messages in the caller's families that were sent by
      someone else.
    - An existing (message, reader, kind) row is left alone.
    - Any kind other than `delivered` also records `delivered` if it's
      missing, with the same time.
    - It doesn't accept `replied`.
  - `send_message` also records `replied`, and `delivered` if it's missing,
    from the sender. It does this for every earlier co-parent message in that
    conversation they hadn't replied to yet.
- **Status meanings.** These go in the plan, and court exports (17) will rely
  on them:
  - *Sent:* the message's `created_at`, set by the server.
  - *Delivered:* the message's data first reached the receiving parent's app.
    That's the unread badge's data on any parent page, the list, or the open
    conversation.
  - *Received:* the unread badge on the Messages nav item first showed it,
    with the tab visible, on any parent page.
  - *Previewed:* its text was first shown in a conversation list row.
  - *Read:* its conversation was first opened, with the tab visible. Every
    co-parent message in that conversation counts as read. There's no
    per-bubble on-screen tracking.
  - *Replied:* the receiving parent first sent a message after it, in the same
    conversation.

  Every status except Sent and Replied is recorded by the receiving parent's
  web app.
- **Unread badge.** Every parent page shows the number of the co-parent's
  messages you haven't read yet on the Messages nav item, in both the full
  sidebar and the rail. It updates live and hides at 0.
- **Status display.** Under the latest message in the open conversation, both
  parents see its status in order, each with its date and time:
  - "Sent …"
  - "Delivered …"
  - "Received …"
  - "Previewed …"
  - "Read …"

  "Sent …" replaces the bubble's plain time. Replied isn't shown. Earlier
  messages don't show their status; it's kept for export.
- **Live updates.** On every parent page, a browser Supabase client
  subscribes to Realtime `postgres_changes` on all three tables, filtered to
  the parent's family. The messages pages refresh, and the badge refetches. Realtime
  applies RLS to each subscriber. Any insert triggers a debounced
  `router.refresh()`, so:
  - new conversations, new messages, and new statuses appear without a
    reload, for both parents
  - the server stays the only source of the data
- **Which family.** A parent with several co-parents sees their earliest-joined
  family (`joined_at`, then `family_id`). Feature 5c adds switching. A link to
  a conversation in another of their families still opens.
- **Routes.**
  - `/messages` shows the list. At `xl+` it also shows "Select a conversation".
  - `/messages/[conversationId]` opens a conversation. Unknown, malformed, or
    other-family ids return `notFound()`.
  - `/messages/new` shows the start form.
  - List rows and the back button become links, replacing 6a's client
    `selectedId`.
- **Start a conversation.** A "New conversation" button in the list header
  opens `/messages/new`. The form has a labelled subject and first-message
  field, a submit button, and a cancel link. On success it redirects to the new
  conversation.
- **Send.**
  - The 6a composer becomes a form that posts to a server action.
  - While pending, the button and textarea are disabled.
  - On success the composer clears, and the new message shows at the bottom.
- **List.**
  - The list keeps 6a's two-line preview of the latest message. You chose to
    record previews rather than hide the text.
  - It's ordered by latest activity.
- **Validation.** Shared by the client and the server action, and enforced
  again in the database:
  - The subject is trimmed and must be 1–150 characters.
  - The body is trimmed at the ends, keeping inner newlines, and must be
    1–10,000 characters.
  - Whitespace-only input is rejected.
- **Unpaired parents.**
  - Messages stays in the sidebar.
  - `/messages` keeps the messages layout: the rail, and the Conversations
    column with its empty state but no New conversation button.
  - The main area tells them to add a co-parent, with a button to
    `/dashboard`, where the invite form lives. With a pending invite, the
    prompt names the invited email.
  - `/messages/new` and `/messages/[id]` redirect to `/messages`.
  - A "legal professional" option waits for feature 28, as you decided.
- **States.**
  - *Loading:* the Suspense shell.
  - *Empty:* the empty state plus New conversation.
  - *Invalid input:* a field error linked through `aria-describedby`, with
    focus on the first invalid field. The error clears on a successful submit.
  - *Failed send or start:* an alert with `role="alert"`, keeping the text.
  - *Load error:* the generic `auth.errors.unexpected` alert in the shell.
  - *Realtime disconnected:* the page still works on reload. Nothing extra is
    shown.
  - *Failed receipt recording:* logged without message text, and retried on the
    next render. It never blocks reading.
- **Professionals.** They're redirected to `/dashboard` as before, and RLS
  gives them no rows.
- **Names.** Your own name is the page's `userName`. The co-parent's is
  `profiles.name`, or a translated "Your co-parent" when it's null.
- **Proxy.** Signed-out visitors to `/messages/*` go to `/sign-in`. Today only
  the exact path `/messages` is matched.
- **Text.** All new UI strings are in English and French. User text is only
  ever rendered as React text nodes, never as HTML, with
  `whitespace-pre-wrap break-words`.
- Delete `sample-conversations.ts` and move its types to `types.ts`.

## Out of scope

- Attachments and storage counting (6c).
- The access log of every view, sign-in, and reply, and the hash chain
  columns (7).
- Search (8), the tone meter (25), and calls (26).
- Statuses recorded by email or push (18, 20). Until then, statuses come from
  the parent web app.
- Inviting a legal professional (28).
- Message pagination. A conversation loads all its messages.
- Lapsed-parent send restrictions (16c), hiding a co-parent through
  `hidden_at` (5c), and co-parent switching (5c).
- Rate limits on sending. None is established.

## Build loop

`workflow.stepReview` is `feature`: build every step, then present one review
packet after the last step. Checkpoint commits are disabled. `/complete`
creates the single feature commit.

Development runs against `tango-staging`. Pushing the migration
(`npx supabase@latest db push`) is a remote change that needs its own explicit
yes. Show the SQL before asking.

## Build steps

- [x] **1. Migration.**
  - Run `npx supabase@latest migration new conversations_and_messages`.
  - `conversations`:
    - `id uuid pk default gen_random_uuid()`
    - `family_id` references `families` and `started_by` references
      `profiles`, both `not null on delete restrict`
    - `subject text not null check (subject = btrim(subject) and char_length(subject) between 1 and 150)`
    - `created_at timestamptz not null default now()`
    - Index on `(family_id, created_at desc)`.
  - `messages`:
    - `id uuid pk`
    - `seq bigint generated always as identity unique`
    - `family_id`, `conversation_id`, and `sender_id`, all `not null` with
      restrict
    - `body text not null check (body = btrim(body, E' \t\r\n') and char_length(body) between 1 and 10000)`
    - `created_at default now()`
    - Index on `(conversation_id, seq)`.
  - `message_receipts`:
    - `id uuid pk`
    - `family_id`, `message_id`, and `reader_id`, all `not null` with restrict
    - `kind text not null check (kind in ('delivered','received','previewed','read','replied'))`
      (the first migration used the earlier names; see step 8)
    - `created_at default now()`
    - `unique (message_id, reader_id, kind)`
  - RLS on all three: select with `private.is_family_member(family_id)`.
    `revoke all` from `anon`, and revoke insert, update, and delete from
    `authenticated`.
  - Add a `private.reject_append_only_change()` trigger. It runs
    `before update or delete` for each row and `before truncate` for each
    statement on all three tables, and raises `append_only`.
  - Functions, all with `set search_path = ''`. Execute is revoked from public
    and anon, and granted to authenticated. Each raises stable codes:
    - `start_conversation(target_family_id uuid, conversation_subject text, message_body text) returns uuid`:
      `not_authenticated`, `not_member`, `invalid_subject`, `invalid_body`.
    - `send_message(target_conversation_id uuid, message_body text) returns uuid`:
      - A missing conversation and a non-member both raise `not_member`.
      - The family comes from the conversation.
    - `record_message_receipts(receipt_kind text, message_ids uuid[]) returns void`:
      - Raises `invalid_kind` for an unknown kind. More than 500 ids raises
        `too_many`.
      - It joins the ids to `messages` where the caller is a family member and
        isn't the sender, so other ids are silently ignored.
      - It inserts with `on conflict do nothing`. For every kind except
        `delivered`, it also inserts `delivered` first.
    - `unread_messages(target_family_id uuid) returns table (id uuid)` is
      `security invoker`. It returns up to 500 of the co-parent's messages in
      that family that have no `read` receipt from the caller.
  - `conversation_previews` view with `security_invoker = true`. It returns
    each conversation plus its latest message's `id`, `sender_id`, `body`, and
    `created_at`, through a lateral `order by seq desc limit 1`. Grant select
    to authenticated.
  - Run `alter publication supabase_realtime add table` for `conversations`,
    `messages`, and `message_receipts`.
  - Run `npx supabase@latest db lint`. With approval, run `db push`. Then
    regenerate `packages/shared/src/database.types.ts` with
    `gen types typescript --linked`.
  - Done when:
    - The push succeeds.
    - The types include the tables, functions, and view.
    - In the staging SQL editor, `update` and `delete` on each table raise
      `append_only`. Report this as not run if it wasn't.
    - Typecheck passes.
- [x] **2. Loading, routes, and unpaired prompt.**
  - Add `apps/web/src/lib/conversations.ts` with:
    - The validation helpers and limits.
    - A request loader. It reads:
      - the parent's earliest family
      - the co-parent's id and name
      - the previews, ordered by `coalesce(latest_created_at, created_at) desc`
      - for a selected id: the conversation, its messages ordered by `seq`, and
        the receipts for its latest message
    - A mapping from user ids to `"me" | "coParent"`.
  - Validate the UUID first, and treat no row as not found.
  - Move `loadWelcome` from the dashboard page into a shared server module,
    used by both pages.
  - Add the `[conversationId]` and `new` route pages, with Suspense fallbacks
    and `generateMetadata`. Unpaired parents get the add-a-co-parent prompt
    on `/messages` (step 8), and child routes redirect to `/messages`.
  - Load errors log only `{ code, message }`.
  - The proxy gates `/messages/*`.
  - `MessagesView`, `ConversationList`, and `ChatPanel` take real props, and
    rows and back become `next/link` links. Delete `sample-conversations.ts`.
  - Done when, on staging:
    - A paired parent sees real conversations, or the empty state.
    - A conversation opens with its messages in order.
    - A foreign or invalid id gives the not-found page.
    - An unpaired parent sees the invite prompt on `/messages`.
    - Typecheck and lint pass.
- [x] **3. Start a conversation.**
  - Add a server action `startConversation` in
    `app/[lang]/messages/actions.ts`. It validates the input, calls
    `start_conversation` with the loader's family, maps the known codes to
    translated errors, logs other errors without user text, and redirects to
    `/messages/<id>`.
  - Add a `NewConversationForm` built with `useActionState`. It reuses the
    auth field styles, `FormAlert`, `SubmitButton`, and
    `use-focus-first-error`, and keeps values after an error.
  - Add the New conversation button to the list header.
  - Done when:
    - A started conversation opens with its first message and a server time.
    - Empty or too-long input shows a focused field error.
    - Typecheck and lint pass.
- [x] **4. Send messages.**
  - Add a `sendMessage` server action that calls `send_message` and
    `revalidatePath`.
  - The composer form disables while pending or when the text is blank. On
    success it resets and scrolls to the newest message. On error it shows an
    alert with `role="alert"` and keeps the text.
  - Done when:
    - A sent message appears at the bottom with a server time and moves its
      conversation to the top.
    - A double click sends once.
    - Typecheck and lint pass.
- [x] **5. Record and show message status.**
  - Add `apps/web/src/lib/supabase/client.ts`, a `createBrowserClient<Database>`
    from `@supabase/ssr`, which is already installed.
  - Add a `recordStatus(kind, ids)` helper in `message-status.ts`. It calls
    `record_message_receipts` through the browser client, skips ids already
    sent in this session, and logs failures without text. The same file
    holds `useOnShown`.
  - Recording:
    - The list records delivered and previewed for each row's co-parent
      latest message.
    - The open conversation records delivered for its co-parent messages,
      and read when the tab is visible. If the tab is hidden, it records read
      on the next `visibilitychange` to visible.
  - Add a `MessageStatusLine` under the latest bubble. It shows Sent and each
    recorded status, with the date and time from a new `dateTime` format in
    `useDateFormat`.
  - Done when, with two accounts on staging:
    - B opening the list records delivered and previewed.
    - Opening the conversation records read.
    - Both see the status under the latest message after a reload.
    - Repeat visits add no rows.
    - Typecheck and lint pass.
- [x] **6. Unread badge, received, and live updates.**
  - Add an optional `count` to `NavigationItem`. `DashboardShell` shows it as
    a Tailwind Plus sidebar count badge in the full sidebar, and as a small
    count on the rail icon, with an sr-only "{count} unread".
  - Add a `useMessagesActivity(familyId)` client hook, used by
    `ParentDashboard` and `MessagesView`. It:
    - Loads `unread_messages(familyId)` and records delivered for those ids.
    - Records received for them while the badge is shown and the tab is
      visible.
    - Subscribes to inserts on the three tables with `family_id=eq.<id>`.
      Each event refetches the unread ids. On messages pages it also calls
      `router.refresh()`, debounced by about 300 ms.
    - Unsubscribes on unmount.
  - The dashboard page passes the parent's family id when paired. Unpaired
    parents get no badge and no subscription.
  - Done when, with two browsers on staging:
    - A sends a message, and B's dashboard badge appears live and records
      delivered and received.
    - B opening the conversation clears the badge and records read.
    - A sees each status appear live under the latest message.
    - B sees A's new conversation live.
    - Typecheck and lint pass.
- [x] **7. Message status migration.**
  - Add `supabase/migrations/<timestamp>_message_status.sql`. The first
    migration is already pushed, so it can't be edited. The new one:
    - replaces the `kind` check with
      `delivered | received | previewed | read | replied`
    - redefines `record_message_receipts` with those names (rejecting
      `replied`)
    - redefines `send_message` to record `replied` (and `delivered`, if
      missing)
    - redefines `unread_messages` to use `read`
  - Receipts are append-only, so existing rows can't be renamed. If any
    exist, adding the new check fails and the migration rolls back.
  - With a fresh yes, run `db push`, then regenerate the types.
  - Done when:
    - The push succeeds.
    - After A replies, B's message has a `replied` row.
    - Typecheck and lint pass.
- [x] **8. Add-a-co-parent prompt.**
  - Replace `ParentWelcome` on `/messages` with a `NoCoParentPrompt` in the
    unchanged messages layout. Its strings are `conversations.noCoParent.*`,
    in English and French.
  - Done when:
    - An unpaired parent who opens Messages stays on `/messages`, in the
      messages layout.
    - They see the prompt, with a pending-invite variant, and its button
      opens the dashboard.
    - Typecheck and lint pass.
- [x] **9. Verify.**
- [x] **10. Review repairs (F-16 to F-20).**
  - F-16: give each `useMessagesActivity` mount its own Realtime topic, so
    a remount never reuses a channel that's still leaving.
  - F-17: `recordStatus` sends every fresh id, in chunks of 500.
  - F-18: an unpaired parent opening `/messages/<id>`, including a malformed
    id, is redirected to `/messages` instead of the not-found page.
  - F-19: subjects and bodies need at least one visible character.
    - Client: JavaScript `trim()`.
    - Database: a new migration adds `private.has_visible_text`, used in
      check constraints on `conversations.subject` and `messages.body`, and
      in `start_conversation` and `send_message`. It treats Unicode
      whitespace as blank, including the non-breaking space.
    - Pushing it needs a fresh yes.
  - F-20: move `blockReadsOutsideWorkingDirectories` from
    `.claude/settings.json` to the git-ignored `.claude/settings.local.json`.
  - Done when:
    - Each finding is marked `fixed`.
    - The migration is pushed and the types are regenerated.
    - Typecheck, lint, and build pass.
  - Run `npm run typecheck`, `npm run lint:web`, and `npm run build:web`.
  - Done when all three pass. Report every manual staging check from earlier
    steps as run or not run, exactly.

## Files / areas

- `supabase/migrations/<timestamp>_conversations_and_messages.sql` (new)
- `packages/shared/src/database.types.ts` (regenerated)
- `packages/shared/src/i18n/en.ts`, `fr.ts`: new `conversations.*` strings:
  - new conversation, the subject and message labels, start and cancel
  - the co-parent fallback name
  - `status.label`, `sent`, `delivered`, `received`, `previewed`, and
    `read`, plus `dashboard.navigation.unread`
  - `errors.subjectRequired`, `subjectTooLong`, `bodyRequired`,
    `bodyTooLong`, and `sendFailed`
- `apps/web/src/lib/conversations.ts` and `lib/supabase/client.ts` (new). A
  shared welcome loader (new, moved from `dashboard/page.tsx`).
- `apps/web/src/app/[lang]/messages/page.tsx`, `[conversationId]/page.tsx`,
  `new/page.tsx`, and `actions.ts`.
- `apps/web/src/app/[lang]/dashboard/page.tsx`: use the shared welcome loader.
- `apps/web/src/components/conversations/`:
  - `messages-view.tsx`, `conversation-list.tsx`, `chat-panel.tsx`, and
    `use-date-format.ts` are updated.
  - `types.ts`, `new-conversation-form.tsx`, `message-status.ts`, and
    `use-messages-activity.ts` are new.
  - `sample-conversations.ts` is deleted.
- `apps/web/src/components/dashboard/dashboard-shell.tsx` (nav count),
  `parent-dashboard.tsx` (activity hook).
- `apps/web/src/proxy.ts`
- Plans, already updated with your approval in this review:
  - the 6b and 7 lines in `build-plan.md`
  - the message status paragraph and its export references in
    `project-plan.md`
  - features 6 and 7 and `message_receipts` in `project-overview.md`
  - the six statuses (sent, delivered, received, previewed, read, replied),
    in all three

## Data / contracts

- **Trusted actor.** `auth.uid()` in every function. The client never supplies
  `started_by`, `sender_id`, `reader_id`, `family_id` (for messages and
  receipts), `created_at`, or `seq`.
- **Tenant scope.**
  - Reads go through RLS on family membership. The view is
    `security_invoker`.
  - Realtime `postgres_changes` checks the same RLS for each subscriber. The
    `family_id` filter only narrows the stream; it's never what grants access.
- **Atomicity and idempotency.**
  - Starting inserts the conversation and its first message in one call.
  - Receipts are unique per (message, reader, kind) and inserted with
    `on conflict do nothing`, so retries and repeated views keep the first
    time.
- **Ordering.** Messages are ordered by `seq`. `created_at` is for display and
  the record.
- **Function errors.** A raised message is a stable code: `not_authenticated`,
  `not_member`, `invalid_subject`, `invalid_body`, `invalid_kind`,
  `too_many`, or `append_only`. Any other error gets the generic message.
- **Server action results** reuse `ActionResult`. `values` gains `subject` and
  `body`, and the field keys are `subject` and `body`.
- **Immutability.** No code updates or deletes these tables. The triggers
  reject any attempt.
- **Logs.** Never log subjects or bodies. Only codes and ids.

## Testing

No unit or browser test command is configured, so tests aren't a gate.
Evidence is typecheck, lint, and build, plus manual checks on staging with two
paired accounts in two browsers:

- start, send, and receive
- live updates
- the unread badge, plus recording and display of message status
- replied saved after a reply
- a foreign-id 404
- the unpaired prompt
- validation errors
- `update` and `delete` rejected in SQL

Report each manual check as run or not run.

## Notes for the AI

- Follow `20261020102645_family_invites.sql` for function style, grants, and
  error codes. Follow `dashboard/actions.ts` for actions and error mapping.
- Keep 6a's visual design. Data, links, the enabled composer, and the
  status line are the only visible changes.
- `router.refresh()` after a parent's own receipt insert causes one more
  refresh, then stops, because no new receipts follow. Keep the debounce.
- The project overview is about 19,990 bytes, just under the 20,000 limit
  for `/overview`. Don't grow it in this feature.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":23917,"specSha256":"61a5b7c14548b8a192e9b71fdbe12bb25b9469fa6071fae9b0c2adc54bf24fd6","branch":"refs/heads/feature/conversations-and-messages","head":"cc80d8f0f33401f60b3ffca304e25fb64e29b2a6","baseRef":"refs/heads/dev","baseCommit":"404a486f077bcbc3d7b8540396e514faca23d364","sourceTree":"c58a7d788d68a2b4433fe7fdab701896e2852171","landing":"local-merge","absentOptional":[]} -->

## Findings

### 6b/F-16 [P2] closed - Remounting the activity hook can reuse a leaving Realtime channel and silently drop live updates

**File:** apps/web/src/components/conversations/use-messages-activity.ts:53
**Found:** 2026-10-22 by /audit independent (scope: current; lens: quality, performance)
**Why it matters:** Every mount uses the fixed topic `family-messages:<familyId>`. The cleanup calls `removeChannel`, which only sends `leave` and sets the channel to `leaving`; the channel stays in the client's list until the server acknowledges. In the installed realtime-js 2.117.3, `channel(topic)` returns that existing leaving channel (`RealtimeClient.js:338-349`), `.on()` is allowed on it, and `subscribe()` is a silent no-op unless the state is `closed` (`RealtimeChannel.js:140`). When the ack arrives, the channel closes and `removeChannel` tears it down, so the new mount has no subscription. Any remount with the same family before the ack (for example a back/forward navigation restored from the router cache, where unmount and mount happen in one commit, or switching between `/dashboard` and the messages routes when data is already cached) leaves the badge and the messages pages without live updates until a full reload. The spec accepts a disconnected Realtime as a degraded state, so no data is lost, but the "Live updates" contract silently fails. Library path confirmed by reading the installed source; not reproduced in a browser.
**Suggested fix:** Give each hook instance its own topic, for example `family-messages:${familyId}:${crypto.randomUUID()}` created inside the effect, so a new mount never picks up a channel that is still leaving. No current requirement is lost.
**Resolution:** Re-examined 2026-10-22 (target 1fa775b, fresh independent review): still open at line 53. The fixed topic `family-messages:${familyId}` is unchanged; installed realtime-js `RealtimeClient.channel()` still returns an existing channel with the same topic, and `removeChannel` only tears down after the `unsubscribe` ack. The delta adds a third mount site (`MessagesView` on the unpaired path passes null, so it is unaffected), and React Strict Mode's dev double-mount hits the same path. Severity stays P2. Closed 2026-10-22 (target 7302f31, fresh independent subagent review): `use-messages-activity.ts:56` now builds the topic inside the effect as `family-messages:${familyId}:${crypto.randomUUID()}`, so a new mount never receives a channel that is still leaving; cleanup still clears the debounce timer and removes its own channel. No new defect found.

### 6b/F-17 [P3] closed - Opening a conversation with more than 500 co-parent messages leaves the newest unread

**File:** apps/web/src/components/conversations/message-status.ts:17
**Found:** 2026-10-22 by /audit independent (scope: current; lens: quality)
**Why it matters:** `recordStatus` sends only the first 500 not-yet-sent ids, and `ChatPanel` passes co-parent ids oldest first (`chat-panel.tsx:213`). In a conversation with more than 500 co-parent messages, the first open records `read` (and `delivered`) only for the oldest 500. `useOnShown` fires again only on a visibility or intersection change or a new message (its key), not on the Realtime refresh, so the newest messages stay unread, the unread badge (which lists the newest 500) does not clear, and their Read time is recorded late. Rare in v1 but reachable, and Read times are court-export data.
**Suggested fix:** In `recordStatus`, send every fresh id in chunks of 500 (several RPC calls), or pass ids newest first so the visible, latest messages are always covered. No current requirement is lost.
**Resolution:** Re-examined 2026-10-22 (target 1fa775b, fresh independent review): unchanged, still open at `message-status.ts:17` (`.slice(0, 500)`) with `chat-panel.tsx:213` passing ids oldest first. Severity stays P3. Closed 2026-10-22 (target 7302f31, fresh independent subagent review): `recordStatus` (`message-status.ts:19-33`) now marks every fresh id and sends them in 500-id chunks, matching the database's `too_many` limit; a failed chunk un-marks only its own ids for retry. No new defect found.

### 6b/F-18 [P3] closed - Unpaired parent opening a conversation link gets a 404 instead of a redirect to Messages

**File:** apps/web/src/lib/messages-data.ts:38
**Found:** 2026-10-22 by /audit independent (scope: current; lens: quality)
**Why it matters:** The spec says `/messages/[id]` redirects an unpaired parent to `/messages`. `loadFamilyMessages` looks up the conversation before the family, so for any well-formed UUID an unpaired parent's RLS returns no row and the loader returns `"not-found"` (lines 38-49); `messages-page.tsx:47` calls `notFound()` before the `family === null` redirect at line 53 is reached. Only `/messages/new` and malformed ids behave as specified (malformed ids also 404). Low impact: an unpaired parent has no conversations to link to, but a stale or shared link shows the not-found page instead of the add-a-co-parent prompt.
**Suggested fix:** In `loadFamilyMessages`, when the conversation lookup finds no row, check `loadFamilyId` and return `null` if the parent has no family (or have `messages-page.tsx` resolve the family first for unpaired parents). No current requirement is lost.
**Resolution:** Closed 2026-10-22 (target 7302f31, fresh independent subagent review): `loadFamilyMessages` (`messages-data.ts:50-55`) now checks `loadFamilyId` when the conversation lookup returns no row (including malformed ids, which skip the query), returning null for a parent without a family, so `messages-page.tsx` redirects non-list modes to `/messages`; paired parents still get `notFound()`. No new defect found.

### 6b/F-19 [P3] closed - A message body of only non-ASCII whitespace is accepted

**File:** apps/web/src/lib/conversations.ts:26
**Found:** 2026-10-22 by /audit independent (scope: current; lens: quality, security)
**Why it matters:** The spec says whitespace-only input is rejected. `cleanBody` trims only `[ \t\r\n]`, and the database matches it (`btrim(body, E' \t\r\n')` in the check at `20261022105927_conversations_and_messages.sql:26` and in `start_conversation`/`send_message`, `20261022112001_message_status.sql:66`). A body of a non-breaking space, form feed, vertical tab, or other Unicode whitespace therefore passes both layers. It is reachable from the UI through the New conversation form (the subject is fine because JavaScript `trim()` covers Unicode whitespace; the composer's send button uses `trim()` too, so it stays disabled there) and from a direct RPC call. The result is a permanent, visually blank court-record message. Same root cause as F-08 for names.
**Suggested fix:** Reject bodies whose content is only whitespace in both layers while keeping inner newlines, for example client `if (!body.trim()) return errors.bodyRequired` and, in a new migration, `if clean_body !~ '\S' then raise exception 'invalid_body'` in both functions plus a replacement check `body ~ '\S'`. No current requirement is lost.
**Resolution:** Closed 2026-10-22 (target 7302f31, fresh independent subagent review): `validateBody` now rejects `!body.trim()` (`conversations.ts:43`), and `20261022232759_visible_text.sql` adds `private.has_visible_text`, used in new check constraints on `conversations.subject` and `messages.body` and in both functions. Reasoned from Postgres ARE semantics (SQL not executed): the bracket is `[^[:space:]` plus U+00A0, U+1680, the range U+2000-U+200A, U+2028, U+2029, U+202F, U+205F, U+3000, U+FEFF; ranges in Postgres regex compare code points (pg_wchar) independent of collation, none of the inserted characters is `]`, `^`, `-` or `\`, and `[:space:]` covers ASCII tab, newline, vertical tab, form feed, carriage return and space. That is exactly JavaScript's trim set, so a string matches only when it has a character outside it; empty input returns false. Inserts run inside the security definer functions (owner privileges), so revoking execute from public does not block them. No new defect found.

### 6b/F-20 [P3] closed - Personal Claude Code permission override committed to shared project settings

**File:** .claude/settings.json:5
**Found:** 2026-10-22 by /audit independent (scope: current; lens: security, quality)
**Why it matters:** The delta adds `"permissions": { "blockReadsOutsideWorkingDirectories": false }` to the checked-in project settings. It is not part of the 6b spec (not in Files / areas) and relaxes an AI-tool read guard for every contributor and agent that opens this repository, not only this machine. The same delta git-ignores `.claude/settings.local.json`, which is the place for a personal override. No product impact.
**Suggested fix:** Move the `permissions` block to `.claude/settings.local.json` (now ignored) and drop it from `.claude/settings.json`, or record an explicit decision to keep it project-wide. No current product requirement is lost.
**Resolution:** Closed 2026-10-22 (target 7302f31, fresh independent subagent review): `.claude/settings.json` at the target is byte-identical to the base (only `enabledPlugins`), and `.claude/settings.local.json` is git-ignored (`.gitignore:45`).

## Independent review

**Status:** passed
**Target commit:** cc80d8f0f33401f60b3ffca304e25fb64e29b2a6
**Base commit:** ae67a64b97f6a5bbf23032faab4c810bc23b0a16
**Base ref:** origin/dev
**Spec hash:** 61a5b7c14548b8a192e9b71fdbe12bb25b9469fa6071fae9b0c2adc54bf24fd6
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-22T23:35:57Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-22T23:39:28Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Handoff

Review the active spec and the complete `ae67a64b97f6a5bbf23032faab4c810bc23b0a16..cc80d8f0f33401f60b3ffca304e25fb64e29b2a6` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

## Commands

- `npm run typecheck`: pass (mobile, web, shared)
- `npm run lint:web`: pass
- `npm run build:web`: not run by the reviewer (out of the requested command set)
- Unit and browser tests: unavailable (no test command or browser harness configured)

## Evidence

- Freshness: `HEAD` = target, `git merge-base origin/dev HEAD` = base, SHA-256 of `blueprint/context/current-feature.md` = spec hash, and the only differing path is `blueprint/context/review.md`.
- Reviewed the full base..target delta (43 files): the three migrations (`conversations_and_messages`, `message_status`, `visible_text`), `messages/actions.ts`, `messages-page.tsx` and the three routes, `lib/conversations.ts`, `lib/families.ts`, `lib/messages-data.ts`, `lib/supabase/client.ts`, `proxy.ts`, the conversations components (`chat-panel`, `conversation-list`, `messages-view`, `message-status`, `use-messages-activity`, `new-conversation-form`, `no-co-parent-prompt`, `types`, `use-date-format`), the dashboard shell, navigation and page, `use-focus-first-error`, en/fr strings, regenerated types, plan docs, and `.gitignore`.
- Merged dev change: `git diff 7302f31 baa2bfe` is byte-identical to `404a486` for `apps/web` and the lockfile (only `next`/`eslint-config-next` 16.4.0 to 16.4.2, `experimental.agentUpgrade: "security"`, which is also the installed 16.4.2 default, and the fix archive). Installed `next` is 16.4.2. No 6b file is touched by the merge, and `baa2bfe..cc80d8f` changes only the review and findings files.
- Security: every write goes through `security definer` functions with `set search_path = ''`, actor from `auth.uid()`, membership checked; tables grant only select to `authenticated` after `revoke all` (including truncate); RLS uses `private.is_family_member`; the view is `security_invoker`; append-only triggers cover update, delete, and truncate. `has_visible_text` check constraints run under the definer owner, so revoking execute from public does not block inserts. Server actions validate UUIDs and log only codes. User text renders only as React text nodes.
- Spec conformance: routes, unpaired redirects (including malformed ids), validation limits (code points), status recording and display order, unread badge (sidebar and rail, sr-only label), per-mount Realtime topic, chunked status recording, and debounced refresh match the spec.
- F-04 re-examined because the proxy changed: still open (P3), now also reached by signed-out `/messages/*` redirects.

## Findings

- None new. F-04 [P3] re-examined and still open. No P0 or P1 finding is open or fixed.

## Remaining risk

- No unit or browser test command is configured, so no automated behavioral coverage exists for the actions, loader, hooks, or SQL functions.
- `npm run build:web` was not run by the reviewer, so the production build with Next.js 16.4.2 plus the 6b routes is unverified in this review.
- No SQL was executed by the reviewer: the migrations, append-only triggers, `has_visible_text` regex, and the replied and receipt inserts were reviewed by reading only.
- Realtime delivery, token handling for the browser client, and the live status updates were not exercised in a browser in this review.
