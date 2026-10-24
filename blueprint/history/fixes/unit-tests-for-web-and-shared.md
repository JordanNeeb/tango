# Fix: Unit tests for web and shared

**Type:** Fix
**Status:** verified
**Branch:** feature/unit-tests
**Landed:** `9f87ef0` on `dev` (squash-merged and pushed directly, without a
spec or `/complete`; this entry was written afterward)

## The problem

The project had no test runner, so nothing checked the existing logic
automatically and tests were not a gate for `/feature` and `/implement`.

## The fix

Set up Vitest from the repo root for `apps/web` and `packages/shared`, and
cover the logic built so far.

- **Runner.** `vitest` is a root dev dependency. `vitest.config.mts` includes
  `apps/web/src/**/*.test.ts` and `packages/shared/src/**/*.test.ts`, runs in
  Node, maps `@/` to `apps/web/src/`, and stubs `server-only`.
- **Commands.** `npm test` (`vitest run`) and `npm run test:watch`, recorded in
  the Commands section of `AGENTS.md`. Declaring a test command turns tests on
  as the gate for logic-bearing steps.
- **Fakes** in `test/`. `fakeSupabase` gives chainable queries that record
  their calls, queued results per table, rpc answers, and session claims.
  `test/next.ts` stands in for `next/headers`, `next/navigation` (redirect
  throws), `next/cache`, and the server Supabase client.
- **Coverage** (18 files, 226 tests, each file next to its source):
  - shared: `isLanguage`; English and French have the same keys, no empty
    strings, and the same placeholders
  - validation and helpers: auth fields, conversation subject and body
    (code-point lengths), `preferredLanguage`, `formatPrice` and tiers,
    invite tokens
  - data loaders: `loadFamilyId`, `loadWelcome`, `loadConversations`,
    `loadConversation`
  - `recordStatus` dedupe, 500-id batching, and retry; `parentNavigation`
  - server actions: auth, messages, dashboard invites, profile, language
  - route handlers: `/auth/callback`, `/auth/confirm`, `/auth/invite/[token]`
  - `proxy.ts` language rewrites and signed-in/signed-out routing
- **Standards.** `coding-standards.md` records the Vitest binding for web and
  shared and the fakes approach.

Out of scope: UI components and React hooks (`useDateFormat`, `useOnShown`),
the Expo app (Jest with `jest-expo` later), and the Deno edge function
`send-family-invite`.

## Verify

- `npm test`: 18 files, 226 tests passed.
- Four bugs planted on purpose (open-redirect guard, signed-in `/sign-up`
  redirect, status batch size, unknown receipt kinds) each failed a test, then
  were reverted.
- `npm run typecheck`, `npm run lint:web`, and `npm run build:web` passed.

## Try it now

1. Run `npm test` from the repo root: 18 files and 226 tests pass.
2. Run `npm run test:watch`, change a rule in
   `apps/web/src/lib/auth/validation.ts` (for example the 8-character password
   minimum), and watch the related test fail; undo it and it passes again.
