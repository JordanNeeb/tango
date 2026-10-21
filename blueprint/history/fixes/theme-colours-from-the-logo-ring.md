# Fix: Theme colours from the logo ring

**Type:** Fix
**Status:** verified
**Branch:** fix/theme-colours-from-the-logo-ring

## The problem

The app's accent colour is Tailwind's stock `indigo` palette, and it doesn't
match the indigo ring in the Tango logo. The accent covers primary buttons,
links, focus outlines, selected states, check marks, and chat bubbles. The
owner sets the colours (project overview, UI), and they want the theme to match
the logo.

Measured from `apps/web/src/app/icon.png` (the logo art, also used for
`public/brand/mark.png`):

| | Hex | OKLCH |
| --- | --- | --- |
| Logo indigo ring | `#4758FF` | `oklch(55.7% 0.244 271.2)` |
| Tailwind `indigo-500` (current) | `#6366F1` | `oklch(58.5% 0.233 277.1)` |
| Tailwind `indigo-600` (current) | `#4F46E5` | `oklch(51.1% 0.262 277.0)` |

The ring is about 6 degrees bluer than Tailwind's indigo, and its lightness sits
between 500 and 600.

The accent is used in 12 files, plus Catalyst's `button.tsx` (through
`var(--color-indigo-*)`): `indigo-500` 31 times, `indigo-600` 16, and
`indigo-400` 11, with a few 50/200/300/800 uses.

## The fix

Retune the `indigo` palette once, in `apps/web/src/app/globals.css`, by
overriding `--color-indigo-50` through `--color-indigo-950` in its existing
`@theme` block. Every `indigo-*` class and Catalyst variable picks the new
colour up with no component edits.

- **`indigo-500` is the ring exactly:** `#4758FF` /
  `oklch(55.7% 0.244 271.2)`. It's the accent used most (dark-mode buttons,
  focus outlines, bubbles). White text on it is 5.1:1, which passes WCAG AA.
- **The other steps** keep Tailwind's lightness and chroma, with the hue moved
  to the ring's 271.2. That keeps the scale's contrast relationships (light
  mode's `indigo-600` buttons, `indigo-400` dark-mode hovers) the same as
  today.
  - If a step's chroma falls outside sRGB at the new hue, lower it until it
    fits, so the colour renders the same on every screen.
  - Write each value as `oklch(...)`, the same format Tailwind uses.
- Add a one-line comment saying the scale is tuned to the logo's ring.

Keep these unchanged:

- Class names stay `indigo-*`. No component, Catalyst, or reference file
  changes.
- The logo artwork, the orange ring, and every non-indigo colour.
- Dark/light behaviour from the previous fix.

## Build steps

- [x] **1. Retune indigo.**
  - Add the eleven `--color-indigo-*` values to `@theme` in `globals.css`, with
    500 set to the ring.
  - Done when:
    - `npm run build:web` passes.
    - The built CSS defines `--color-indigo-500` as the ring value.
    - `npm run typecheck` and `npm run lint:web` pass.
  - Built-CSS check found one hard-coded copy of the old `indigo-600`: the
    landing hero glow's `to-[#4f46e5]` in `landing-hero.tsx`. It becomes
    `to-indigo-600` so it follows the palette, the only component edit.

## Verify

- Run `npm run dev:web` and open the landing page. Compare the **Get started**
  button with the logo's blue ring beside it.
- Sign in and check:
  - In dark mode, `/messages` bubbles and the send button should be the ring
    colour.
  - In light mode, the invite button on `/dashboard` should be one step darker
    in the same hue.
  - Focus outlines (Tab through a form) and the Settings language check mark.
- Text on accent buttons stays readable in both themes.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3338,"specSha256":"ddf72887d488f7bf4040862239cc57f70665c63512f0f92c6a4bdd8955748e21","branch":"refs/heads/fix/theme-colours-from-the-logo-ring","head":"2d8e75abc5150538e62c12425bcb8575a7071b64","baseRef":"refs/heads/dev","baseCommit":"2d8e75abc5150538e62c12425bcb8575a7071b64","sourceTree":"2b1f336bfdb397c780f2cc5aa1d25b559f4b1263","landing":"local-merge","absentOptional":[]} -->

## Commands

- `npm run typecheck`: pass
- `npm run lint:web`: pass
- `npm run build:web`: pass; built CSS defines `--color-indigo-500` as `#4758ff` and contains no stock indigo values

Not run: `/check`, `/audit`, and visual browser comparison. No test command is configured. Independent review was not selected (styling only).

## Try it now

1. Start the dev server (`npm run dev:web`) and open http://localhost:3000.
2. Compare the **Get started** button and the background glow with the blue ring in the logo; they are the same blue.
3. Sign in as a parent with macOS in **Dark** mode, open `/messages`, and pick a conversation. Your bubbles and the send button are exactly the ring colour.
4. Switch to **Light** mode. The invite button on `/dashboard` is the same blue, one shade darker.
5. Tab through the sign-in form. Focus outlines are the ring blue.
