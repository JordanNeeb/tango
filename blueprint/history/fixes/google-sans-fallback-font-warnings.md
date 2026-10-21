# Fix: Google Sans fallback font warnings

**Type:** Fix
**Status:** verified
**Branch:** fix/google-sans-fallback-font-warnings

## The problem

Every `next dev` and `next build` prints two warnings:

```
Warning: Failed to find font override values for font `Google Sans Code`
Skipping generating a fallback font.
Warning: Failed to find font override values for font `Google Sans`
Skipping generating a fallback font.
```

The fonts come from `apps/web/src/app/[lang]/layout.tsx`, which loads
`Google_Sans` and `Google_Sans_Code` through `next/font/google` (added by
`fix/use-google-sans-fonts-on-web`).

Cause: `next/font` defaults to `adjustFontFallback: true`. That builds a
metric-matched fallback face from a table of font metrics bundled with Next.js,
and neither Google Sans nor Google Sans Code is in that table. So Next.js warns
and skips the fallback. The fonts themselves load and render correctly. The
only effect is that nothing reliable stands in for them before they load,
because no `fallback` list is set either.

## The fix

In `layout.tsx`, on both font calls:

- Set `adjustFontFallback: false`. That tells Next.js not to look up metrics
  that don't exist, which is the documented option for this case (Next.js 16
  `next/font` docs, `adjustFontFallback`).
- Set an explicit `fallback` list so text renders in a sensible system face
  until the font arrives. These lists match Tailwind's default stacks:
  - `Google_Sans`: `["ui-sans-serif", "system-ui", "sans-serif"]`
  - `Google_Sans_Code`: `["ui-monospace", "SFMono-Regular", "Menlo", "monospace"]`

Keep these unchanged:

- Both fonts stay. They're still self-hosted by `next/font`, with the same
  variables, `latin` subset, and the `globals.css` mapping.
- No new dependency, and no hand-written metric overrides. Computing overrides
  through `next/font/local` would be extra machinery to trim a brief layout
  shift on first load.

## Build steps

- [x] **1. Silence the fallback lookups.**
  - Add `adjustFontFallback: false` and the `fallback` lists above to both
    calls in `layout.tsx`.
  - Done when:
    - `npm run build:web` passes with neither "Failed to find font override
      values" warning in its output.
    - `npm run typecheck` and `npm run lint:web` pass.

## Verify

- Run `npm run build:web`. The two font warnings are gone.
- Run `npm run dev:web` and open http://localhost:3000. The app still renders
  in Google Sans (in DevTools: Elements > Computed > Rendered Fonts shows
  "Google Sans").


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2500,"specSha256":"f72f477d897f6a537341f2aa697d52ba2c89d440e959032c8c8ff938322d162a","branch":"refs/heads/fix/google-sans-fallback-font-warnings","head":"e15ac45e9ef94f44ef416131b2260c3746eb7eb2","baseRef":"refs/heads/dev","baseCommit":"e15ac45e9ef94f44ef416131b2260c3746eb7eb2","sourceTree":"6211edadb622fc2c0b0cdc4875d52ea5080f4fd0","landing":"local-merge","absentOptional":[]} -->

## Commands

- `npm run typecheck`: pass
- `npm run lint:web`: pass
- `npm run build:web`: pass, with 0 "Failed to find font override values" warnings (2 before); built CSS uses `font-family: Google Sans, ui-sans-serif, system-ui, sans-serif` and the matching monospace stack

Not run: `/check`, `/audit`, the dev server, and a browser rendering check. No test command is configured. Independent review was not selected (config only).

## Try it now

1. Run `npm run dev:web` and watch the terminal. Neither "Failed to find font override values" warning appears.
2. Open http://localhost:3000. In DevTools, Elements > Computed > Rendered Fonts on any text shows "Google Sans".
