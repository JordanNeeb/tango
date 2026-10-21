# Fix: Sidebar logo size

**Type:** Fix
**Status:** verified
**Branch:** fix/sidebar-logo-size

## The problem

The dashboard sidebar and the Messages icon rail show different logos:

- The full sidebar (`/dashboard`, and the mobile sidebar dialog on every page)
  uses the wide Tango wordmark: `<Logo onDark href="/dashboard" />`, 109x36.
  It's in `Sidebar` in `apps/web/src/components/dashboard/dashboard-shell.tsx`.
- The rail on `/messages` uses the square mark: `<Logo mark href="/dashboard" />`,
  32x32 (`size-8`), in `Rail` in the same file.

Moving between Dashboard and Messages swaps the wordmark for the mark, so the
logo visibly shrinks on navigation.

## The fix

Revised at the owner's request: keep the wordmark (`logo-dark.png` /
`logo-light.png`) in the full sidebar at a smaller size. The owner tried 32px
(the mark's height) and chose 28px.

- Add a `small` option to `Logo` in
  `apps/web/src/components/common/logo.tsx`. It renders the wordmark at `h-7`
  (28px tall, 85px wide at the artwork's 1497x493 ratio) instead of `h-9`
  (36px), with matching `next/image` width and height.
- `Sidebar` uses `<Logo onDark small href="/dashboard" className="pl-0.5" />`.
  The sidebar is dark in both themes, so it keeps the white-text version. The
  owner asked for 2px of left padding (`pl-0.5`).
- The rail keeps the 32px mark: an 85px wordmark doesn't fit the 80px rail.
- The wordmark starts 26px from the left edge (`px-6` plus the 2px padding);
  the mark starts 24px in, centred in the `w-20` rail. Both are vertically
  centred in a `h-16` row.

Keep these unchanged:

- The default wordmark size (36px) on the landing hero, pricing, onboarding,
  and profile.
- The rail, sidebar widths, and nav.

## Build steps

- [x] **1. Wordmark at the mark's height in the full sidebar.**
  - Add `small` to `Logo` and use it in `Sidebar`.
  - Done when:
    - `/dashboard`'s sidebar shows the white wordmark 28px tall, with 2px of
      left padding.
    - The mobile sidebar dialog shows the same small wordmark.
    - `npm run typecheck`, `npm run lint:web`, and `npm run build:web` pass.

## Verify

Run `npm run dev:web` and sign in as a parent on a desktop-width window.
Click between **Dashboard** and **Messages**. The 28px wordmark (with 2px left
padding) and the 32px mark share a vertical centre. Open the mobile sidebar (narrow window, menu
button). It shows the same small wordmark.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2409,"specSha256":"66a6141494a29c2df289b3e05c91e72894081905bd377e53e1f5449a85d93281","branch":"refs/heads/fix/sidebar-logo-size","head":"3161a14417a51137bdcd604f1733ad0518a4b3cb","baseRef":"refs/heads/dev","baseCommit":"3161a14417a51137bdcd604f1733ad0518a4b3cb","sourceTree":"81474c156f36e92fe2cf9bc0db22daf444f49bcc","landing":"local-merge","absentOptional":[]} -->

## Commands

- `npm run typecheck`: pass
- `npm run lint:web`: pass
- `npm run build:web`: pass

Not run: `/check`, `/audit`, and a browser check. No test command is configured. Independent review was not selected (styling only). The owner reviewed sizes iteratively in chat (mark, then 32px, then 28px with 2px left padding).

## Try it now

1. Run `npm run dev:web` and sign in as a parent in a desktop-width window.
2. Click between **Dashboard** and **Messages**. The 28px white wordmark (with 2px left padding) and the 32px rail mark share a vertical centre in the top row.
3. Narrow the window and open the sidebar with the menu button. It shows the same small wordmark.
