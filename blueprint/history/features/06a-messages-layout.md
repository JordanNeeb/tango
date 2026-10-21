# Feature: Messages layout

**From build-plan:** feature 6a
**Build attempt:** 1
**Branch:** feature/messages-layout
**Status:** verified

## Goal

Give parents a Messages page. It's the second item in the parent sidebar
(Heroicons `ChatBubbleLeftRightIcon`). Clicking it opens the multi-column
dashboard layout: a narrow icon rail, a narrow stacked list of conversations,
and the chat on the right. The page uses placeholder conversations so the
design can be reviewed before 6b adds real, append-only data.

## Design reference

- Layout: `design/references/tailwind-plus/application/multi-column-dashboard-dark.jsx`
  (icon rail `lg:w-20`, sticky header, secondary column `xl:w-96` fixed beside
  the rail, main `xl:pl-96`). `multi-column-dashboard-light.jsx` is kept for a
  future light mode, matching how `dashboard-light.jsx` is kept today.
- Conversation list: `design/references/tailwind-plus/application/narrow-stacked-list-dark.jsx`.
  The dark file now holds the dark markup. Each row is the initials avatar
  (profiles have no photos), then the subject in place of the name, then a
  preview of the latest message. Selected and hover rows use `bg-white/5`.
- Chat inspiration (not replicated pixel for pixel; restyled in the dark
  Tailwind/Catalyst palette):
  [desktop](<../../design/references/screenshots/Screenshot 2026-10-20 at 8.55.34 PM.png>)
  and [mobile](<../../design/references/screenshots/Screenshot 2026-10-20 at 8.56.18 PM.png>).
  Take from them: the conversation header with avatar and subtitle, rounded
  bubbles (your own on the right in the accent colour, the co-parent's on the
  left in a neutral surface), the timestamp under each bubble, a centred date
  divider pill with rules on either side, and a rounded composer with a round
  send button. Leave out calls, voice notes, read ticks, typing, online dots,
  and image messages. Those belong to features 26, 7, and 6c, or aren't
  planned.
- No Catalyst component fits a chat or app shell, so these Tailwind Plus
  application references are the source (per the web styling standard).
  Reuse the shell's existing classes rather than introducing new tokens.

## In scope

- Parent sidebar: **Messages** directly below Dashboard, with
  `ChatBubbleLeftRightIcon`, linking to `/messages`. Dashboard links to
  `/dashboard` instead of `#` so parents can get back. The other placeholder
  items and teams are unchanged.
- `/messages` route for signed-in parents. The proxy treats it as signed-in
  only (signed-out visitors go to `/sign-in`), and the page verifies the
  session itself.
- Multi-column variant of `DashboardShell`:
  - Desktop (`lg+`): the full `w-72` sidebar becomes an icon rail (`w-20`).
    Each nav item shows only its icon, with the name in `sr-only`, and
    `aria-current="page"` on the current item. The logo becomes the Tango
    mark, and Settings becomes an icon-only button at the bottom of the rail
    that opens the same language popover.
  - The secondary column (`xl+`) holds the conversation list.
  - Main fills the rest of the viewport height below the header.
  - The mobile sidebar dialog, header, search placeholder, notifications
    placeholder, and account menu are unchanged.
- Conversation list (narrow stacked list):
  - Each row shows the subject, the latest sender's initials avatar, a
    two-line preview of the latest message, and its time.
  - Rows are buttons. The selected row has `aria-current="true"` and the
    selected style.
  - Empty state when there are no conversations.
- Chat panel:
  - Header: initials avatar, subject, and "Started by {name}".
  - Messages are in order, with a date divider wherever the day changes. Your
    own messages are right-aligned in indigo. The co-parent's are
    left-aligned in a neutral surface, with their initials avatar.
  - Each bubble has its time under it. Screen readers get the sender's name
    and full date/time.
  - The newest message is in view when a conversation opens.
  - Composer: a labelled textarea and a send button. The button stays
    disabled because sending is 6b.
  - When no conversation is selected, a "Select a conversation" state shows.
- Responsive behaviour: below `xl` the secondary column is hidden, so main
  shows the list until a conversation is picked. Picking one shows the chat
  with a back button (`xl:hidden`) that returns to the list. At `xl+`, the
  list and chat sit side by side and nothing is selected on load.
- Loading state: the Suspense fallback is the shell in the multi-column
  layout with empty columns.
- Error state: if the profile read fails, the page shows the generic
  `auth.errors.unexpected` alert in the shell, like the dashboard does.
- Professionals who open `/messages` are redirected to `/dashboard`. Their
  sidebar never shows Messages.
- Every new UI string is in English and French.

## Out of scope

- Database tables, migrations, RLS, server actions, and real conversations or
  messages (6b). No stored data changes in this feature.
- Starting a conversation (no "new conversation" button), sending, and
  any URL per conversation such as `/messages/[id]` (6b decides the shape).
- Hiding Messages from parents without a family, and gating by family
  membership (6b, when real data exists).
- Attachments (6c), first-viewed or read indicators (7), search (8), the tone
  meter (25), and calls (26).
- Replacing the other placeholder nav items, teams, the header search, or
  the notifications placeholders.
- Light mode, and mobile app messaging (20).

## Build loop

`workflow.stepReview` is `feature`: build every step, then present one review
packet after the last step. Checkpoint commits are disabled. `/complete`
creates the single feature commit.

## Build steps

- [x] **1. Route, navigation, and multi-column shell.**
  - Extract the parent navigation from `parent-dashboard.tsx` into a helper
    that takes the current page (`"dashboard" | "messages"`). Add Messages
    second, and point Dashboard at `/dashboard`.
  - Add optional `aside` and `title` props to `DashboardShell`. When `aside`
    is given, render the rail, the `xl` secondary column, and the
    full-height main, following `multi-column-dashboard-dark.jsx`. `title`
    replaces the sr-only `h1` (default stays `dashboard.title`).
  - Add a compact (icon-only, `sr-only` label) mode to `SettingsMenu` for the
    rail.
  - Add a mark variant to `Logo` using a copy of `apps/web/src/app/icon.png`
    at `apps/web/public/brand/mark.png`, with alt "Tango", still linking to
    `/dashboard`.
  - Add `/[lang]/messages/page.tsx`, following the dashboard page's pattern:
    `getClaims`, redirect to `/sign-in`, read `profiles.name, account_type`,
    redirect professionals to `/dashboard`, show the error alert on a failed
    read, and use a Suspense fallback and `generateMetadata`. Add
    `"/messages": "/sign-in"` to the proxy's `SIGNED_IN_ONLY`. Add the
    `dashboard.navigation.messages` and `conversations.*` strings in
    `en.ts` and `fr.ts`.
  - The page renders a `MessagesView` client component with empty columns for
    now.
  - Done when:
    - Messages sits under Dashboard in the parent sidebar.
    - Clicking it loads `/messages` in the rail layout, with Messages marked
      current, the mark logo, and a working icon-only Settings popover.
    - Dashboard still renders in the full sidebar layout.
    - Signed out, `/messages` redirects to `/sign-in`.
    - `npm run typecheck` and `npm run lint:web` pass.
- [x] **2. Conversation list.**
  - Add placeholder data in `components/conversations/sample-conversations.ts`:
    three or four conversations of several messages each across at least two
    days, with fixed ISO timestamps. The sender is `"me"` or `"coParent"`,
    and the placeholder co-parent's name sits in that file.
  - Port the narrow stacked list to dark in `conversation-list.tsx`, with the
    selected-row style, `aria-current`, and the empty state.
  - `MessagesView` owns `selectedId: string | null` (initially `null`),
    renders the list in the `aside` and, below `xl`, in main while nothing is
    selected.
  - Done when:
    - At `xl+` the list fills the secondary column, and clicking a row
      highlights it.
    - Below `xl` the list shows in main, and a pick switches main to a
      placeholder chat area with a working back button.
    - Passing an empty array temporarily shows the empty state.
    - Typecheck and lint pass.
- [x] **3. Chat panel.**
  - Add `chat-panel.tsx` with the header, the ordered message list with date
    dividers, bubbles, the composer, the "Select a conversation" state, and
    scroll-to-newest when the selected conversation changes.
  - Your own name comes from the page's `userName`.
  - Done when:
    - Picking a conversation shows its messages oldest to newest, with the
      newest in view, your messages right in indigo and the co-parent's left
      with an avatar, times under the bubbles, and dividers between days.
    - The send button is disabled.
    - Switching the language to French translates all UI chrome and date
      formats.
    - Typecheck and lint pass.
- [x] **4. Verify.**
  - Run `npm run typecheck`, `npm run lint:web`, and `npm run build:web`.
  - Done when all three pass. Report any manual browser checks as
    not run unless they were actually run.

## Files / areas

- `apps/web/src/components/dashboard/dashboard-shell.tsx` - `aside` and
  `title` props, rail sidebar, secondary column.
- `apps/web/src/components/dashboard/parent-navigation.ts` (new) - parent nav
  items with the current page.
- `apps/web/src/components/dashboard/parent-dashboard.tsx` - use the helper.
- `apps/web/src/components/dashboard/settings-menu.tsx` - compact mode.
- `apps/web/src/components/common/logo.tsx` - mark variant.
- `apps/web/public/brand/mark.png` (new) - copy of `apps/web/src/app/icon.png`.
- `apps/web/src/app/[lang]/messages/page.tsx` (new) - server page.
- `apps/web/src/components/conversations/messages-view.tsx`,
  `conversation-list.tsx`, `chat-panel.tsx`, `sample-conversations.ts`,
  `initials-avatar.tsx`, `empty-state.tsx`, `use-date-format.ts` (new).
- `apps/web/src/proxy.ts` - `/messages` signed-in only.
- `packages/shared/src/i18n/en.ts`, `fr.ts` - `dashboard.navigation.messages`
  and a `conversations` section. It's named `conversations` rather than
  `messages`, so `useMessages().conversations` doesn't read as
  `messages.messages`.
- Commit the untracked references this feature uses:
  `design/references/screenshots/`, `multi-column-dashboard-{dark,light}.jsx`,
  and `narrow-stacked-list-{dark,light}.jsx`.

## Data / contracts

- No database, API, or server action changes. The only server reads are the
  existing `profiles.name, account_type` read, scoped by the session's
  `claims.sub`.
- Placeholder shape (in memory only, replaced in 6b):
  `{ id: string; subject: string; startedBy: "me" | "coParent"; messages:
  { id: string; sender: "me" | "coParent"; body: string; createdAt: string
  (ISO 8601) }[] }`.
- The placeholder subjects and bodies stand in for user-written content, so
  they're English only and live in the fixture, not the i18n files. All UI
  chrome is translated.
- Route: `/messages`, with no query or path parameters, and selection held in
  client state only.

## Testing

- No test command is configured, so there are no automated tests. The gate
  is typecheck, lint, and build.
- Manual checks for `/check`, if run:
  - Desktop at `xl` (list and chat side by side) and at `lg` (rail with the
    list in main).
  - Mobile width (dialog sidebar, list to chat to back).
  - French.
  - Keyboard: Tab through rail, list rows, back, and composer.
  - Signed-out redirect, and the professional redirect.
- Baseline: on this checkout before the spec, `npm run typecheck` and
  `npm run lint:web` passed.

## Notes for the AI

- Read the Next.js 16 docs in `node_modules/next/dist/docs/` before writing
  the page, as `apps/web/AGENTS.md` asks. The dashboard page is the pattern.
- Render all message text as React text children (never
  `dangerouslySetInnerHTML`), with `whitespace-pre-wrap break-words` so
  long words and line breaks don't break the layout. The same rule applies
  in 6b when the content becomes real user input.
- Format dates and times with `Intl.DateTimeFormat` in the page language.
  Copy how `parent-welcome.tsx` reads the browser time zone through
  `useSyncExternalStore`, so server and client output can't mismatch at
  hydration.
- Initials avatars reuse the shell's team-initial style (rounded, `bg-white/5`,
  `ring-white/10`) instead of photos. Profiles have no avatar.
- Use `PaperAirplaneIcon` for send and `ChevronLeftIcon` for back. Every
  icon-only control has an `sr-only` name.
- Composer textarea: a visible-to-screen-readers label (`sr-only`
  `<label htmlFor>`), with the send button `type="button" disabled`. Don't
  fake sending in local state.
- The chat fills `h-[calc(100dvh-4rem)]` below the header. The message list
  scrolls, and the composer stays pinned at the bottom.
- The shell keeps `<a href>` for nav items, as today.
- Keep comments to the why (porting source, the placeholder data being
  replaced in 6b), per the comment standard. No em dashes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":13223,"specSha256":"58f7d927bd58a1851b029a9f9fbe6a22f7313d37cd21f1b133931aeb78bfecb1","branch":"refs/heads/feature/messages-layout","head":"7d1103db19fe31d08a08092b9b77901daca25c0a","baseRef":"refs/heads/dev","baseCommit":"7d1103db19fe31d08a08092b9b77901daca25c0a","sourceTree":"11c6d5044a998527d42e5a20712b941c3291028e","landing":"local-merge","absentOptional":[]} -->

## Commands

- `npm run typecheck`: pass
- `npm run lint:web`: pass
- `npm run build:web`: pass (`/[lang]/messages` listed, `/en/messages` and `/fr/messages` prerendered)

Not run: `/check`, `/audit`, and live browser checks (layout, scroll, popover position, French). No test command is configured. Independent review was not selected (no data, permission, or migration changes).

## Try it now

1. Start the dev server (`npm run dev:web`) and sign in as a parent at http://localhost:3000.
2. Click **Messages** under Dashboard. The sidebar collapses to an icon rail and the conversation list appears.
3. On a wide window, click **Friday pickup time**. The chat opens on the right at the newest message, with your bubbles on the right in indigo and day dividers between dates.
4. Narrow the window below about 1280px. The list fills the page; pick a conversation, then use the back arrow to return.
5. Open the gear at the bottom of the rail, switch to Français, and the labels and dates change to French.
