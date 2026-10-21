# Fix: Dashboard light and dark mode

**Type:** Fix
**Status:** verified
**Branch:** fix/dashboard-light-and-dark-mode

## The problem

The rest of the web app follows the OS colour scheme. Tailwind's default `dark:`
variant uses `prefers-color-scheme`, and the root layout sets
`bg-gray-50 dark:bg-gray-900`. The parent and professional dashboards and the
Messages page don't follow it: `fix/dark-dashboard-design` made the dashboard
shell always dark "until a dark-mode toggle exists". Every page in the shell is
dark even when the OS is set to light:

- `apps/web/src/components/dashboard/dashboard-shell.tsx`: dark-only header,
  search field, account menu, page background, and Messages secondary column.
- `apps/web/src/components/dashboard/settings-menu.tsx`: dark-only popover.
- `apps/web/src/components/conversations/*`: the list, avatars, empty states,
  chat header, bubbles, date dividers, and composer have only dark classes.
- `parent-welcome.tsx` and `professional-dashboard.tsx` already carry light and
  dark classes. Their comments still explain workarounds for an always-dark
  shell.

## The fix

Apply the existing system-settings approach to the dashboard pages: light
classes by default, `dark:` variants for the current dark look. Add no toggle,
no stored preference, and no theme provider.

Follow the light references, which the owner supplied:

| Reference | What it says for light mode |
| --- | --- |
| `design/references/tailwind-plus/application/dashboard-light.jsx` | Header `border-gray-200 bg-white`, search `bg-white text-gray-900 placeholder:text-gray-400`, icons `text-gray-700`/`text-gray-400`, separators `bg-gray-900/10`, account menu `bg-white shadow-lg outline-gray-900/5` with `text-gray-900 data-focus:bg-gray-50`, page `bg-white`. **The sidebar stays `bg-gray-900` in both themes.** Only the mobile dialog panel drops the `before:bg-black/10` overlay. |
| `design/references/tailwind-plus/application/multi-column-dashboard-light.jsx` | The same header and menu. The rail stays `bg-gray-900` but drops the `before:` border and overlay. The secondary column uses `border-gray-200`. |
| `design/references/tailwind-plus/application/narrow-stacked-list-light.jsx` | `divide-gray-100`, title `text-gray-900`, date and preview `text-gray-600`, avatar `bg-gray-50`. |

The current dark classes become the `dark:` half of each pair. Where a
reference has no light equivalent, reuse the light/dark pairs already in the
repo:

- Chat: own bubbles `bg-indigo-600 dark:bg-indigo-500`, like the repo's buttons.
- Co-parent bubbles: `bg-gray-100 text-gray-900`.
- Date pill: `bg-white text-gray-600 ring-gray-200`, with rules `bg-gray-200`.
- Composer: the light input classes from `parent-welcome.tsx`.
- Selected and hover rows: `bg-gray-50`.

Keep these unchanged:

- The sidebar and rail stay dark in both themes, so `Logo onDark`, the sidebar
  nav colours, and the mark keep working.
- The Settings popover follows the theme like the account menu it's styled
  after, using the same light classes.
- The landing hero, pricing, and onboarding screens are dark in both themes by
  design. The profile page already follows the theme. Neither is touched.
- Every dark-mode class value stays as it is today, so dark mode looks
  identical.

Also:

- Update the comments that say the shell is always dark (`dashboard-shell.tsx`,
  `professional-dashboard.tsx`, `parent-welcome.tsx`).
- The welcome section's `bg-white dark:bg-gray-900` surface now matches the
  page and stays. The professional panel keeps its card.

## Build steps

- [x] **1. Shell and settings.**
  - Give the header, search, notification and menu buttons, separators,
    account menu, page background, and secondary column light defaults with
    `dark:` pairs, per the references.
  - Make the mobile dialog sidebar's and rail's `before:` overlay and border
    dark-only.
  - Theme the Settings popover and its rows, back row, check icon, and error
    alert.
  - Update the always-dark comments.
  - Done when:
    - With the OS in light mode, the dashboard header and content are white,
      the sidebar is dark, and the account and Settings menus are white.
    - With the OS in dark mode, everything looks as it does today.
    - `npm run typecheck` and `npm run lint:web` pass.
- [x] **2. Messages page.**
  - Pair every class in `components/conversations/` (list, initials avatar,
    empty state, chat header, back button, bubbles, timestamps, date divider,
    composer, send button) with a light default.
  - Done when:
    - In light mode, `/messages` shows a white list column with gray dividers,
      dark text, light co-parent bubbles, indigo own bubbles, and a light
      composer.
    - Dark mode is unchanged.
    - Typecheck and lint pass.
- [x] **3. Verify.**
  - Run `npm run typecheck`, `npm run lint:web`, and `npm run build:web`.
  - Done when all three pass. Report the browser checks below as not run
    unless they were actually run.

## Verify

Start `npm run dev:web` and sign in as a parent. Switch the OS appearance
(macOS: System Settings > Appearance) between Light and Dark, and check these in
each theme:

- `/dashboard` (welcome page): header, account menu, Settings popover, and the
  invite section.
- `/messages` at a wide window: the list column, a selected conversation, the
  chat, and the composer. Then at a narrow window: the list, the chat, and back.
- The mobile sidebar dialog: it stays dark in both themes.
- A professional account's dashboard: the "No families yet" panel.
- Text and icons stay readable, and focus outlines stay visible in both themes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":5612,"specSha256":"f019d0a74dcd025b3358e7b97bceadefc8ea760b4c79a2b65542808a9cafbab5","branch":"refs/heads/fix/dashboard-light-and-dark-mode","head":"1a4b07b7f270aae6c71649d70249603f533194a7","baseRef":"refs/heads/dev","baseCommit":"1a4b07b7f270aae6c71649d70249603f533194a7","sourceTree":"87199801204b2be61112ac30f0b48626b481d42f","landing":"local-merge","absentOptional":[]} -->

## Commands

- `npm run typecheck`: pass
- `npm run lint:web`: pass
- `npm run build:web`: pass

Not run: `/check`, `/audit`, and live browser checks in either OS theme. No test command is configured. Independent review was not selected (styling only).

## Try it now

1. Start the dev server (`npm run dev:web`) and sign in as a parent at http://localhost:3000.
2. Set macOS to **Light** (System Settings > Appearance). On `/dashboard` the header and page are white with the sidebar still dark; the account menu and Settings popover are white.
3. Open `/messages` and pick a conversation. The list column, chat, date pills, and composer are light, with your bubbles in indigo and the co-parent's in light gray.
4. Switch macOS to **Dark**. Both pages look exactly as they did before this fix.
