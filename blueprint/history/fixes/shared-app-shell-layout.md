# Fix: Shared app shell layout

**Type:** Fix
**Status:** verified
**Branch:** fix/shared-app-shell-layout

## The problem

Moving between signed-in pages (Dashboard, Messages, a conversation) reloads
the whole screen: the header and sidebar flash instead of only the page content
changing.

- The sidebar and rail links in
  `apps/web/src/components/dashboard/dashboard-shell.tsx` are plain `<a>` tags,
  so every click is a full document load.
- There is no shared layout. `dashboard/page.tsx` (through `ParentDashboard` /
  `ProfessionalDashboard`) and the messages routes (through `MessagesView`)
  each render their own `DashboardShell`, so navigating unmounts one shell and
  mounts another.
- Each page's `Suspense` fallback is an empty shell (`userName=""`,
  `navigation={[]}`), which shows first and then gets replaced, so nav items
  and the user's name blink on every navigation.
- Each page loads the profile and family again just to fill the shell, and
  `ParentDashboard` and `MessagesView` each open their own Realtime
  subscription for the unread badge.

## The fix

Move the shell into one layout that stays mounted across signed-in pages. Pages
render only their content. A small UI context lets a page tell the shell how
to lay itself out. Messages uses this to switch to the icon rail plus a
secondary column, and the dashboard uses the full sidebar.

- **Route group layout.** Move `dashboard/` and `messages/` into
  `src/app/[lang]/(app)/`. Groups don't change URLs. Add
  `(app)/layout.tsx`, which loads the session claims, profile (`name`,
  `account_type`), and family id once inside `<Suspense>` (needed with Cache
  Components). It renders the shell around `{children}`. The layout's fallback
  shows the shell's static chrome and appears only on a hard load, because the
  layout persists across client navigations. If the profile fails to load, the
  shell shows the existing generic error in place of the page.
- **UI context** (`src/components/dashboard/ui-context.tsx`, client).
  `UiProvider` holds the shell's per-page state: `aside` (the secondary column
  content, or none) and `title` (the screen-reader `<h1>`). A page sets them
  with a small hook or component, and they clear when the page unmounts.
  `DashboardShell` reads the context: with an `aside` it renders the rail and
  the secondary column, otherwise the full sidebar. The sidebar re-renders
  without remounting when Messages is clicked. To avoid a wrong sidebar on a
  hard load of `/messages`, the server render and first paint need the right
  variant. The provider seeds its initial state from `usePathname()`, and the
  page's context update then supplies the content.
- **Navigation in the shell.** The shell builds its own navigation from the
  account type: parent items from `parentNavigation`, or the professional
  item. It marks `current` from `usePathname()` and owns the one
  `useMessagesActivity` subscription, with `refresh` on the messages routes.
  Nav and logo links become `next/link` `Link`s.
- **Pages render content only.** `ParentDashboard` and `ProfessionalDashboard`
  return their content without `DashboardShell`. `MessagesView` returns the
  chat area and declares the conversation list as the `aside` through the
  context. The empty-shell `Suspense` fallbacks go away. Loading states sit
  inside the content area instead. Professional redirects and `notFound()` for
  an unknown conversation stay as they are.
- Update the imports of the moved `actions.ts` files (`parent-welcome.tsx`,
  `new-conversation-form.tsx`, `chat-panel.tsx`).
- No new dependencies. `/profile` is out of scope; it doesn't use the shell
  today.

**Must not break:**
- the unread badge count, its "received" recording, and live message refresh
  on the messages pages
- the parent welcome and invite-error flow on the dashboard, and the no-family
  prompt on `/messages`
- professionals redirected from `/messages`, signed-out redirects, and
  `notFound()` for an unknown conversation
- the mobile sidebar dialog, the user menu (Your profile, Sign out), and
  language switching in Settings
- English and French strings, typecheck, lint, and the production build

## Build steps

- [x] **1. Shared layout, UI context, and the dashboard**
  - Add `UiProvider` and the shell's context-driven variant, Link-based nav,
    and shell-owned navigation and unread subscription. Create the `(app)`
    layout, move `dashboard/` into it, and make the dashboards content-only.
  - Done when: `/dashboard` renders inside the shared layout with the full
    sidebar, the name, and the unread badge; typecheck and lint pass.

- [x] **2. Messages through the context**
  - Move `messages/` into `(app)`. `MessagesView` sets the conversation list
    as the `aside` through the context and renders only the chat area. Remove
    the remaining per-page shells and empty-shell fallbacks.
  - Done when: clicking Messages from the dashboard (and back) changes only the
    content and the sidebar variant, with no document reload and no blank nav
    or name; a hard load of `/messages` paints the rail first time; typecheck,
    lint and `npm run build:web` pass.

- [x] **3. Messages without a co-parent use the full sidebar**
  - A parent without a family sees `/messages` with the expanded sidebar and
    no conversation column. The page is one section, centered vertically and
    horizontally in the content area: "No conversations yet", then a short
    paragraph. It says messages are with a co-parent, so add one to start, or
    upgrade to Solo, which lets them call or text anyone's phone. "upgrade to
    Solo" is an inline text link to `/upgrade`, a subscription upgrade page
    built later (404 until then); there is no upgrade button. The existing
    invite button (or "View your invite" when one is pending, with the
    pending line) stays. The strings are in English and French;
    `noCoParent.title` is replaced.
  - The shell's default layout comes from the URL and the family: the rail
    only on the messages pages of a parent with a family. A page's
    `ShellPage` still overrides it, so the context no longer seeds itself
    from the pathname. The hard-load fallback guesses the rail on `/messages`.
  - Done when: a parent without a family sees the full sidebar and the single
    section on `/messages`, with no rail flash on client navigation; typecheck,
    lint and build pass.

## Verify

1. Run `npm run dev:web`, open http://localhost:3000, sign in as a parent.
2. On the dashboard, open DevTools > Network and keep "Preserve log" on. Click
   Messages, a conversation, then Dashboard. No new document request appears,
   and the header (name, avatar) and sidebar never blank or flash. The sidebar
   switches between full and rail without the header moving.
3. Hard-reload `/messages`: the rail and conversation list show straight away,
   with no full-sidebar flash.
4. Send a message from the other parent's account: the unread badge updates on
   the dashboard, and the open conversation refreshes live.
5. Sign in as a professional: the dashboard shows its single nav item, and
   `/messages` redirects to `/dashboard`.
6. Switch to French in Settings: shell and pages are in French.
7. As a parent with no co-parent, click Messages: the sidebar stays expanded
   and the page shows "No conversations yet", centered in the content area,
   with the Solo explanation, an inline "upgrade to Solo" link to `/upgrade`,
   and the invite button.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7480,"specSha256":"ec7cc1c02ccef760c314deb7efee50d9d3709161a455e2ea7689585045287b4f","branch":"refs/heads/fix/shared-app-shell-layout","head":"be73df0281a3205387588aa15d527620a53f026b","baseRef":"refs/heads/dev","baseCommit":"be73df0281a3205387588aa15d527620a53f026b","sourceTree":"d860a98321dc8942171bccbd2ab089f640092167","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Run `npm run dev:web`, open http://localhost:3000 and sign in as a parent
   with a co-parent.
2. Open DevTools > Network with "Preserve log" on. Click Messages, a
   conversation, then Dashboard. No new document request appears, the name and
   header never blank, and the sidebar switches between full and rail in place.
3. Hard-reload `/messages`: the rail shows straight away.
4. Sign in as a parent with no co-parent and click Messages. The sidebar stays
   expanded, and "No conversations yet" sits centered in the content area with
   the Solo explanation, an inline "upgrade to Solo" link to `/upgrade` (404 for
   now), and the invite button.
5. Switch to French in Settings and check the same pages.
