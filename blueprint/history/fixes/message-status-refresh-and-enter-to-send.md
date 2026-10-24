# Fix: Message status refresh and Enter to send

**Type:** Fix
**Status:** verified
**Branch:** fix/message-status-refresh-and-enter-to-send

## The problem

- **Status missing on a new message.** The status under the sender's latest
  message ("Delivered 3:40 PM", "Read 3:42 PM") doesn't appear while the
  conversation is open. It does appear after a reload, so the co-parent's
  receipts are saved and `loadFamilyMessages` loads them correctly. The live
  update is what fails.
- **Likely cause** (from the code; there's no browser here to confirm it):
  - The co-parent's app records "Delivered" as soon as Realtime delivers the
    new message, and "Read" if the conversation is open. That takes about 300ms
    of debounce plus one RPC.
  - On staging, the sender's `sendMessage` Server Action is often still running
    then. It re-renders the page through `revalidatePath`, which reads the
    receipts before they exist.
  - The receipt events trigger `router.refresh()` in `useMessagesActivity`,
    which overlaps that action. The action's response, rendered without the
    receipts, is the last one applied. No later event arrives to correct it.
- **Enter adds a new line.** In the composer (`composer-field.tsx`, used by the
  open chat and the new message screen), Enter inserts a line break and the only
  way to send is the button.

## The fix

- **Refresh once after a send.** In the chat `Composer`, after `sendMessage`
  succeeds, call `router.refresh()`. It runs after the action has finished, so
  it picks up any status recorded while the action was in flight. Later
  statuses still arrive through the existing Realtime refresh. No new
  subscription, polling, or schema change.
- **Enter sends, Shift+Enter breaks the line.** In `ComposerField`:
  - Enter without Shift sends when sending is allowed: it calls
    `requestSubmit()` on the form, so the form's normal action and validation
    run.
  - When sending isn't allowed (empty text, or missing To or Subject on the new
    message screen), Enter does nothing.
  - Shift+Enter keeps the default new line.
  - Enter while an IME composition is active (`isComposing`) is left alone, so
    accented and Asian-language input still works.
  - Both the chat composer and the new message screen get this.

**Must not break:**
- sending, the field and form errors, and the text coming back after an error
- the disabled Send button rules on both screens
- live updates of new messages, the unread badge, and the other statuses
- typecheck, lint, and build

## Build steps

- [x] **1. Status after sending, and Enter to send**
  - Add the post-send `router.refresh()` to the chat composer. Add the Enter
    and Shift+Enter handling to `ComposerField`.
  - Done when: in the composer, Enter sends, Shift+Enter adds a line, and Enter
    with an empty composer does nothing; after a send, the page refreshes once
    more; typecheck, lint, and build pass.

- [x] **2. Keep the Realtime channel open**
  - Step 1 didn't fix it: new messages don't arrive live either. Temporary
    browser logging (forwarded to the dev log) showed the channel reaching
    `SUBSCRIBED` and receiving events. It then closed and resubscribed about
    0.4s later on every send and refresh, so inserts in that gap were lost.
  - Root cause: the subscription effect in `useMessagesActivity` depended on
    `router` (and `refresh`). The router's identity changes on each refresh
    and Server Action, so each one tore the channel down.
  - Fix: read `router` and `refresh` through `useEffectEvent`, so the effect
    depends on `familyId` only. Log a subscription that fails or times out
    (`[messages] live updates unavailable`); remove the temporary `[debug]`
    logging.
  - Done when: the dev log shows one `SUBSCRIBED` per page load and no
    `CLOSED` on sending; typecheck and lint pass. (Achieved. Live delivery
    still failed, which step 3 addresses.)

- [x] **3. Live updates through Broadcast**
  - Findings on staging, from read-only queries and a rolled-back transaction:
    - The browser joins with the user's session, and its bindings match the
      server's.
    - The tables are in the `supabase_realtime` publication, and both
      replication slots are active and caught up.
    - Realtime's own `apply_rls`, run on the latest message, matches the
      co-parent's subscription with no errors.
    - Yet the server sent no `postgres_changes` frames while both parents sent
      messages, and `realtime.subscription` was intermittently empty while
      browsers reported `SUBSCRIBED`.

    Postgres Changes is not delivering on staging. Supabase recommends
    Broadcast for database changes ("the recommended method for scalability
    and security"), so live updates move to it.
  - **Migration** (new, pushed to staging only with separate approval):
    - An `after insert` trigger on `conversations`, `messages` and
      `message_receipts` calls a `private` trigger function. The function sends
      `realtime.send(jsonb_build_object('table', TG_TABLE_NAME), 'change',
      'family:' || new.family_id, true)`: a private Broadcast to that family's
      topic, carrying only the table name, never message text. Clients only
      use the event as a signal to refetch through RLS. `security definer`,
      `search_path = ''`.
    - Who may listen: a select policy on `realtime.messages` for
      `authenticated` that allows `extension = 'broadcast'` only when
      `realtime.topic()` is `family:<uuid>` for a family the caller belongs to.
      It checks through a `private` helper that validates the uuid format
      before casting, so a malformed topic is denied rather than erroring.
      There is no insert policy: clients can't send to the topic, and only the
      database trigger broadcasts.
    - Drop the three tables from the `supabase_realtime` publication, since
      nothing uses Postgres Changes any more.
  - **Client** (`use-messages-activity.ts`): call
    `await supabase.realtime.setAuth()`, then join
    `channel('family:<familyId>', { config: { private: true } })` and listen
    for `broadcast` events named `change`. Everything after the event is
    unchanged: debounce, refetch unread, and refresh on the messages pages.
    Keep the `useEffectEvent` change and the failed-subscription error log.
    Remove all `[debug]` logging.
  - Done when: the migration applies locally (`db lint` clean); typecheck,
    lint, and build pass; after the staging push, a message sent in one
    window appears in the other without a reload, and the sender's status
    updates live.

- [x] **4. Live updates in background tabs**
  - Problem: new messages and statuses appear only once the window is focused.
    Per Supabase's troubleshooting guide ("Handling silent disconnections in
    backgrounded applications"), browsers throttle timers in background and
    unfocused tabs, so the Realtime client misses heartbeats. The server then
    drops the socket without an error.
  - Fix:
    - In `src/lib/supabase/client.ts`, pass `worker: true`, Supabase's
      recommendation, which runs heartbeats in a Web Worker that isn't
      throttled. A dropped socket reconnects through the library's own retry.
      (A `heartbeatCallback` reconnect was dropped in step 11: realtime-js
      2.117.3 never passes it `disconnected`.)
    - The hook catches up after a gap: when its channel rejoins
      (`SUBSCRIBED` again) or the tab becomes visible again, it refetches
      unread and refreshes, so changes missed while disconnected still show.
  - Confirmed with temporary logging (since removed): a hidden window receives
    the broadcast and commits the new message. Its timers are throttled to
    about 1s, and the browser paints it only once it becomes visible. "Read" is
    recorded only while the message is on a visible screen, by design. Both
    windows open and visible update live.
  - Out of scope: a closed browser can't receive anything on the web without
    push notifications. Email notifications (build plan 18) and mobile push
    (20) cover that. "Delivered" stays defined as the parent's app having
    loaded the message.
  - Done when: typecheck, lint, and build pass; with the receiving window in
    the background or unfocused, a new message and the sender's status
    update without focusing it.

- [x] **5. Sent messages appear instantly**
  - Problem: after Send or Enter, the text stays in the composer and the
    message appears only when the Server Action and page refresh return.
  - Fix: `ChatPanel` keeps an optimistic list with React's `useOptimistic`.
    Sending clears the composer and adds the message at once, marked
    "Sending" ("Envoi", the existing string), and scrolls to it. When the action returns, the server
    list replaces it. On an error, the optimistic message disappears, the text
    comes back in the composer, and the error shows as today.
  - Done when: typecheck, lint, and build pass; the message moves from the
    composer to the conversation the moment Send or Enter is pressed.

- [x] **6. Composer stays at the bottom**
  - Problem: in a conversation, scrolling past the last message keeps going.
    The page itself scrolls, the composer moves up, and blank space shows
    below it. There are two scrollbars: the message list's and the page's.
    The multi-column layout sizes the content as `calc(100dvh - 4rem)` under
    the 4rem header, so any extra height lets the whole page scroll.
  - Fix: in the multi-column shell, the content column is exactly the
    viewport's height (`h-dvh`, flex column) with the header on top and `main`
    taking the rest (`flex-1 min-h-0`, `overflow-hidden`). `MessagesView`
    fills `main` (`h-full`) instead of computing its own height. Only the
    message list (and the conversation list column) scroll. Pages with the
    full sidebar are unchanged.
  - That alone didn't stop it: the page still scrolled, header included, so
    the extra height comes from outside the content column. While the
    multi-column layout shows, the shell adds `overflow-hidden` to the root
    element (removed when it leaves), so the page can't scroll at all. The
    message list, the conversation column, and the single-column list use
    `overscroll-contain`, so reaching their end doesn't pass the scroll on.
  - Done when: typecheck, lint, and build pass; in a long conversation,
    scrolling stops at the last message with the composer pinned at the
    bottom, and only one scrollbar shows in the chat.

- [x] **7. Unread conversations stand out in the list**
  - A conversation row with any message from the co-parent that this parent
    hasn't read gets a light Tango-blue background (`bg-indigo-50`,
    `dark:bg-indigo-500/10`) and a 3px Tango-blue left border (`border-indigo-600`, `dark:border-indigo-400`; other rows have a transparent one so text stays aligned) in place of the plain row. The selected row keeps
    its grey. Screen readers hear "Unread" ("Non lu") on the row, so colour
    isn't the only signal.
  - `loadFamilyMessages` marks each `ConversationSummary` with `unread`. It uses
    the existing `unread_messages` RPC (RLS-scoped, latest 500), then reads
    those messages' conversation ids. No migration. Opening a conversation
    records `read`, the broadcast refreshes the list, and the highlight
    clears.
  - Done when: typecheck, lint, and build pass; a conversation with a new
    message from the co-parent is highlighted in the list until it's opened.

- [x] **8. "You:" before your own previews**
  - In the conversation list, when the latest message is the parent's own, its
    preview starts with a visible "You:" ("Vous :" with the French space), in semibold and a lighter grey (`text-gray-400`, `dark:text-gray-300`).
    The co-parent's previews keep the screen-reader-only name prefix.
  - Done when: typecheck, lint, and build pass; a conversation you replied to
    last reads "You: <message>" in the list.

- [x] **9. The conversations panel stays put**
  - Problem: clicking a conversation reloads the panel. Each messages route
    renders `MessagesView`, which loads the whole family list and hands it to
    the shell. Moving to another conversation replaces the page, so the list
    unmounts while the next page loads, then remounts with its scroll reset.
  - Fix: a `messages/layout.tsx` loads what every messages route shares,
    inside `<Suspense>`:
    - It redirects professionals to the dashboard.
    - It loads the family's conversation list (with unread) and the
      co-parent's name, or, without a family, the welcome data.
    - A client `MessagesFrame` provides that through a context and sets the
      list as the shell's `aside`. The layout stays mounted across
      conversations, so the list (and its scroll) does too. It highlights the
      open conversation from the route params.
  - Pages render only their part:
    - `/messages`: the no-co-parent prompt, or below `split` the list in main.
    - `/messages/new`: the new message screen.
    - `/messages/[conversationId]`: the chat, loading only that conversation.
      Its family must be the one listed, or `notFound()`.
    - The child routes still redirect to `/messages` without a family.
  - `loadFamilyMessages` splits into `loadConversations` (list, unread, names)
    and `loadConversation` (one conversation's messages and status).
    `MessagesView` and `messages-page.tsx` go away.
  - Starting a conversation also revalidates the messages layout, so the new
    conversation appears in the list. The family broadcast refreshes it too.
  - Done when: typecheck, lint, and build pass; clicking between
    conversations changes only the chat, with the list and its scroll
    position unchanged.

- [x] **10. Loading skeleton for a conversation**
  - While a conversation loads, the chat column shows a skeleton instead of
    nothing. It's shaped like `ChatPanel`: a header (avatar circle and two
    lines), a few message bubbles alternating left (grey) and right (light
    Tango blue), and a composer bar. It pulses with `animate-pulse`.
  - Neither Catalyst nor the saved Tailwind Plus references include a loading
    state, so this follows `ChatPanel`'s own spacing and colours. It's
    announced as a status with "Loading conversation" ("Chargement de la
    conversation"); the shapes are hidden from screen readers.
  - It's the `[conversationId]` page's `Suspense` fallback, so it shows on
    each conversation change while the list stays put.
  - Done when: typecheck, lint, and build pass; opening a conversation shows
    the pulsing skeleton until its messages appear.

- [x] **11. Independent review repairs (F-16, F-17)**
  - F-16 [P1]: `loadConversations` put up to 500 unread message ids in one
    `.in("id", …)` GET URL. The gateway rejects that past about 200 ids (HTTP
    414), and the error replaced every messages page. The ids are now looked
    up in batches of 100, in parallel, with the results merged. No migration.
  - F-17 [P3]: remove the `heartbeatCallback` from the browser client, since
    realtime-js 2.117.3 drops the `disconnected` status before calling it, and
    correct its comment. The worker heartbeat, the library's reconnect, and
    the hook's catch-up remain.
  - Done when: typecheck, lint, and build pass; F-16 and F-17 are marked
    `fixed` in the findings ledger for re-review.

- [x] **12. The composer grows with the message**
  - The message textarea in `ComposerField` (chat and new message screens)
    grows with its text using CSS `field-sizing: content`, from one line up to
    4 lines plus its padding (`max-h-[calc(4lh+1.25rem)]`), then scrolls
    inside. It shrinks back when text is removed or the composer clears after
    a send. No script.
  - Browsers without `field-sizing` (Firefox at the time of writing) keep the
    one-line box, which scrolls; nothing breaks.
  - Done when: typecheck, lint, and build pass, and the built CSS contains
    both rules.

## Verify

1. Run `npm run dev:web`. Sign in as each parent in two browsers (or one normal
   window and one private window), and open the same conversation in both.
2. In the first, type a message and press Enter. It sends. Within a moment its
   status shows "Read …" (or "Delivered …" if the other window's conversation
   isn't open), without reloading.
3. Press Shift+Enter in the composer: it adds a new line and doesn't send.
   Press Enter with an empty composer: nothing happens.
4. On the new message screen, Enter in the message box sends only once To and
   Subject are filled.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":16593,"specSha256":"bc424bb7e3810e71e6959e2648d2e5c78f967af663259aaf0bf7bb546d068903","branch":"refs/heads/fix/message-status-refresh-and-enter-to-send","head":"e5cf749c2dbf28c7cc45dda7a89a2bebeeef79dc","baseRef":"refs/heads/dev","baseCommit":"f3465e4d4ca8d85f948450db133594cca26af904","sourceTree":"c5edab7dae3a7870d8077387df4dd74629481c07","landing":"local-merge","absentOptional":[]} -->

## Findings

### message-status-refresh-and-enter-to-send/F-16 [P1] closed - Many unread messages make the whole Messages area fail to load

**File:** apps/web/src/lib/messages-data.ts:71
**Found:** 2026-10-24 by /audit independent (scope: current; lens: quality, performance)
**Why it matters:** `loadConversations` passes every id returned by `unread_messages` (up to 500) to `.in("id", ...)`, which supabase-js sends as a GET query string of about 37 bytes per uuid (about 18.5 KB at 500). Against the local stack's gateway, the same `messages?select=conversation_id&id=in.(...)` request returns HTTP 414 at 300 ids (11 KB) and at 500 ids, and passes at 200 (7.4 KB). On 414 the query errors, `loadConversations` returns `"error"`, and the messages layout (`messages/layout.tsx:33-35`) replaces every messages route (list, `/messages/new`, and each conversation) with the generic error. A parent with roughly 220 or more unread messages from the co-parent therefore can't open Messages at all, and can't open a conversation to mark messages read and clear the condition. In a high-conflict family, a backlog that size is realistic. The hosted gateway's exact limit is unverified, but 500 ids exceed common 8 KB and 16 KB request-line limits.
**Suggested fix:** Avoid the id list in the URL. Either return `conversation_id` from the unread lookup in one round trip (a new migration that adds the column to `unread_messages`, or a small security-invoker RPC that returns the distinct unread conversation ids for a family), or, with no migration, split the ids into chunks of about 100 and merge the results. No current requirement is lost.
**Resolution:** Fixed 2026-10-24 on `fix/message-status-refresh-and-enter-to-send` (spec step 11): `loadConversations` looks up unread message ids in parallel batches of 100 (`UNREAD_BATCH`), merging the conversation ids, so no request URL carries more than 100 uuids. Awaiting `/audit` re-review. Closed 2026-10-24 (target e5cf749, fresh independent subagent review): re-examined `apps/web/src/lib/messages-data.ts:69-86`. `unread_messages` returns at most 500 ids, split into at most 5 `.in("id", ...)` requests of 100 uuids (about 3.7 KB each, half the 200-id size that passed the local gateway), run in parallel; every batch error is logged and returns `"error"` as before, and the merged set drives `unread`. The original defect is gone and the repair introduced no new one; typecheck, lint, and build pass.

### message-status-refresh-and-enter-to-send/F-17 [P3] closed - The Realtime heartbeat reconnect callback never runs

**File:** apps/web/src/lib/supabase/client.ts:17
**Found:** 2026-10-24 by /audit independent (scope: current; lens: quality)
**Why it matters:** In the installed `@supabase/realtime-js` 2.117.3, `RealtimeClient._wrapHeartbeatCallback` returns early when `status === 'disconnected'` (dist/main/RealtimeClient.js:585) and never forwards that status to the user callback, so `client.realtime.connect()` is unreachable. Spec step 4 relies on this branch to reconnect a dropped socket. Today the worker heartbeat, Phoenix's own reconnect timer, and the hook's catch-up on rejoin or visibility cover most cases. But a background tab whose socket drops still waits until it's visible again (Phoenix skips reconnecting while the page is hidden), and the comment says otherwise.
**Suggested fix:** Remove the dead `heartbeatCallback` and correct the comment and spec note to rely on the library's reconnect plus the hook's catch-up. If reconnecting while hidden is required, react to `timeout` instead and confirm it in a backgrounded browser. Removing it loses no current requirement, because the branch never runs.
**Resolution:** Fixed 2026-10-24 on `fix/message-status-refresh-and-enter-to-send` (spec step 11): removed the unreachable `heartbeatCallback` from `apps/web/src/lib/supabase/client.ts` and corrected its comment and the spec step 4 note; the worker heartbeat, the library reconnect, and the hook catch-up remain. Awaiting `/audit` re-review. Closed 2026-10-24 (target e5cf749, fresh independent subagent review): `apps/web/src/lib/supabase/client.ts` now passes only `{ realtime: { worker: true } }`, a documented realtime-js 2.117.3 option that starts its built-in inline worker (no `heartbeatCallback`). The comment matches the code, the spec step 4 note was corrected, and the hook's rejoin and visibility catch-up (`use-messages-activity.ts:75-90`) remain. The original defect is gone and the repair introduced no new one.


## Independent review

**Status:** passed
**Target commit:** e5cf749c2dbf28c7cc45dda7a89a2bebeeef79dc
**Base commit:** f3465e4d4ca8d85f948450db133594cca26af904
**Base ref:** refs/remotes/origin/dev
**Spec hash:** bc424bb7e3810e71e6959e2648d2e5c78f967af663259aaf0bf7bb546d068903
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-24T11:12:04Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-24T11:16:39Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `f3465e4d4ca8d85f948450db133594cca26af904..e5cf749c2dbf28c7cc45dda7a89a2bebeeef79dc` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- Freshness (`git rev-parse HEAD`, `git merge-base e5cf749 refs/remotes/origin/dev`, `shasum -a 256 blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`): pass (HEAD, merge base, and spec hash match; only `blueprint/context/review.md` differed)
- `npm run typecheck`: pass
- `npm run lint:web`: pass
- `npm run build:web`: pass
- `npx supabase@latest db lint --local`: pass (no schema errors)
- Rolled-back local probes of the broadcast migration (`psql` on the local stack, with a temporary `realtime.messages` partition inside the transaction): pass
- Test command: unavailable (none configured)

### Evidence

- Reviewed the spec (steps 1-12) and the full 14-commit `f3465e4..e5cf749` delta: the Broadcast migration, `use-messages-activity.ts`, `lib/supabase/client.ts`, `lib/messages-data.ts`, the messages layout and pages, `messages-frame.tsx`, `messages-pages.tsx`, `chat-panel.tsx`, `composer-field.tsx`, `conversation-list.tsx`, `conversation-skeleton.tsx`, `dashboard-shell.tsx`, `actions.ts`, and the i18n strings.
- Local DB: `supabase_realtime` publication is empty; `private.can_receive_family_topic` and `private.broadcast_family_change` are `security definer` with `search_path = ''`, executable only by `postgres` (and `authenticated` for the topic helper); `anon` gets `permission denied for schema private`.
- Policy probe as a family member: own `family:<uuid>` topic visible (10 rows), another family's topic 0, malformed topic 0, upper-case uuid 0; `insert into realtime.messages` as `authenticated` fails RLS, so clients cannot send on the topic. Broadcast payloads carry only `table` (plus Realtime's own row id), never message text.
- With no partition for the day, `realtime.send` only warns and the message/receipt inserts still commit, so a Broadcast failure cannot block sending.
- `useRouter()` in Next 16.4.2 keeps its identity on refresh (`render-tree.js` preserves `bfcacheId`), so the post-send `router.refresh()` effect in `chat-panel.tsx` cannot loop.
- Every query stays RLS-scoped and family-filtered; `loadConversation` rejects malformed ids and conversations outside the listed family with `notFound()`.
- Built CSS contains `field-sizing:content`, `max-h-[calc(4lh+1.25rem)]`, and `border-l-3`.
- F-16 and F-17 re-examined and closed with evidence in the ledger.

### Findings

- F-16 [P1] closed (unread lookup now batched at 100 ids)
- F-17 [P3] closed (dead `heartbeatCallback` removed)
- F-18 [P3] open: per-row broadcast triggers send up to 1,000 signals for one status call (`supabase/migrations/20261024100416_family_broadcasts.sql:64`)

### Remaining risk

- No test command is configured, so Enter-to-send, the optimistic send, unread batching, and the Broadcast hook have no automated tests.
- Live delivery across two browsers, background-tab behaviour with `worker: true`, and the composer's visual growth were not exercised in a browser (Check not required; no dev server started).
- The migration and its RLS policy were probed only on the local stack; staging state and hosted Realtime authorization were not queried.
- Whether F-18's bursts hit the hosted Realtime messages-per-second quota is unverified.

## Try it now

1. Run `npm run dev:web`. Sign in as each parent in two browser windows, both
   visible, on the same conversation.
2. Press Enter on a message: it leaves the composer at once ("Sending"), then
   appears in the other window without a reload, and your status moves to
   "Delivered …" and "Read …". Shift+Enter adds a line, and the composer grows
   up to 4 lines.
3. Send from the other side into a conversation the first window doesn't have
   open: its row turns light blue with a blue left border until opened. Your
   own last message reads "You: …".
4. Click between conversations: only the chat changes, with a pulsing
   skeleton while it loads; the list and its scroll stay. Scrolling past the
   last message never moves the header or the composer.
