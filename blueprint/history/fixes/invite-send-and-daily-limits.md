# Fix: Invite send and daily limits

**Type:** Fix
**Status:** verified
**Branch:** fix/invite-send-and-daily-limits
**Fixes:** F-14

## The problem

F-14 (P2): `mark_family_invite_sent` in
`supabase/migrations/20261020102645_family_invites.sql` is the only limit on
invite emails. It allows one send per invite every 60 seconds for the 7 days the
invite is pending, so up to about 1,440 emails a day to one address per invite,
from Tango's domain and carrying the inviter's free-text name.

The owner set the limits on 2026-10-22:

- **At most 10 sends per invite**, counting the first send.
- **At most 10 new invites per 24 hours per parent.** It's 5 today, in
  `create_family_invite`.

The migration hasn't been pushed to staging yet (`migration list` on
2026-10-21 showed it local-only), so it can still be edited in place.

## The fix

**Database** (edit the unpushed migration in place):

- Add `send_count integer not null default 0` to `family_invites`.
- In `mark_family_invite_sent`:
  - After the `invite_unavailable` check, raise the new code `send_limit` when
    `send_count >= 10`. The existing 60-second `too_soon` throttle stays.
  - The update sets `last_sent_at = now(), send_count = send_count + 1`.
  - It already runs under `for update`, so concurrent sends can't both pass
    the count.
- In `create_family_invite`, change the 24-hour cap from `>= 5` to `>= 10`.
- Update both functions' comments to the new numbers.

**Edge function** (`supabase/functions/send-family-invite/index.ts`):

- Add `send_limit` to `ErrorCode` with status 429.
- Map `markError.message === "send_limit"` to it.
- Update the header comment.

**Web:**

- `inviteErrorMessage` in `apps/web/src/app/[lang]/dashboard/actions.ts` maps
  `send_limit` to a new `sendLimit` message.
- Strings in `packages/shared/src/i18n/en.ts` and `fr.ts`:
  - `sendLimit` (en): "This invite has been sent 10 times, the most allowed.
    Ask your co-parent to check their spam folder."
  - `sendLimit` (fr): "Cette invitation a été envoyée 10 fois, le maximum
    permis. Demandez à votre coparent de vérifier ses courriels indésirables."
  - `inviteLimit` changes to "10 invites" / "10 invitations".

**Types:** add `send_count` to `family_invites` in
`packages/shared/src/database.types.ts`, matching the generator's format. The
owner doesn't run the local stack, so after the migrations are pushed,
regenerate from staging
(`npx supabase@latest gen types typescript --linked > packages/shared/src/database.types.ts`)
and confirm the result is identical.

Keep these unchanged:

- The 7-day expiry, the 60-second throttle, and the rule that only the inviter
  can send.
- F-12 (P3, open) still applies: a send that fails after the mark also uses up
  one of the 10.

This branch also carries the plan and overview TODO about verifying a Resend
sending domain (`INVITE_FROM_EMAIL`), added at the owner's request on
2026-10-22.

## Build steps

- [x] **1. Limits in the migration, function, and app.**
  - Make the changes above. Mark F-14 `fixed` in
    `blueprint/context/findings.md`.
  - Done when:
    - The migration has `send_count`, the `send_limit` check, and the
      `>= 10` invite cap.
    - The function and action map `send_limit`, and both languages have the
      new and updated strings.
    - `npm run typecheck`, `npm run lint:web`, and `npm run build:web` pass.

## Verify

These need staging and are remote changes, each needing a separate yes:

1. Push the 4 pending migrations, including this one:
   `npx supabase@latest db push`.
2. Deploy the function: `npx supabase@latest functions deploy send-family-invite`.
   This needs the `RESEND_API_KEY` and `INVITE_FROM_EMAIL` secrets set first.
3. Regenerate types from staging and confirm they're unchanged.

Then, with `npm run dev:web` pointed at staging:

- Send an invite and press **Send again** (wait a minute between presses).
  After the 10th email, the next press shows the `sendLimit` message.
- The 11th new invite in 24 hours shows "You've sent 10 invites today."

Afterwards, `/audit` re-reviews F-14 to close it.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":4087,"specSha256":"8d56b70c313b4ff972ca425d7d22abc6600afb0099d890f4a5358098591bf157","branch":"refs/heads/fix/invite-send-and-daily-limits","head":"e8de72bddfb189a13f312f5d4fbb0596f207b515","baseRef":"refs/heads/dev","baseCommit":"b89d41aaf88005de7a24a92c55de03e892275356","sourceTree":"4723921c093c611dd7203643abf8cdbeb360450b","landing":"local-merge","absentOptional":[]} -->

## Findings

### invite-send-and-daily-limits/F-14 [P2] closed - Send again is limited only to once a minute per invite, for 7 days

**File:** supabase/migrations/20261020102645_family_invites.sql:162
**Found:** 2026-10-20 by /audit independent (scope: current; lens: security, performance)
**Why it matters:** `mark_family_invite_sent` is the only limit on email sends and allows one send per invite every 60 seconds for as long as the invite is pending (7 days). Calling `send-family-invite` directly (or pressing Send again) therefore emails the same address up to about 1,440 times a day per invite, and with up to 5 new invites a day a single account can keep dozens of live invites. Each email comes from Tango's domain with the inviter's free-text name, so one account can repeatedly mail a recipient and spend Resend quota and sender reputation in staging and production. F-11's cap limits how many addresses are reachable, not how often they are mailed.
**Suggested fix:** Bound sends per invite in `mark_family_invite_sent`, for example a `send_count` column in this unpushed migration with a small maximum (such as 3 to 5 sends per invite, raising a new code mapped to copy), or a longer throttle after the first resend. No current requirement is lost; the owner picks the number.
**Resolution:** Fixed 2026-10-22 on `fix/invite-send-and-daily-limits`: `family_invites.send_count` caps sends at 10 per invite (new `send_limit` code, mapped in `send-family-invite` and the dashboard action with EN/FR copy); the 60-second throttle stays. Not yet exercised against a database (the owner develops against staging and the migration is unpushed). Awaiting `/audit` re-review. Closed 2026-10-22 by /audit independent (target e8de72b): `mark_family_invite_sent` (migration lines 148-175) locks the inviter's row `for update`, raises `send_limit` once `send_count >= 10` after the availability check and before the 60-second throttle, and increments `send_count` with `last_sent_at` in the same statement, so concurrent sends serialize on the row lock and cannot pass the count together. `send_count` is not in the `authenticated` column grant and the table has no client write grant or policy, so clients cannot read or reset it. The Edge Function maps `send_limit` to 429 and the dashboard action and EN/FR strings map it to copy (`fr: Messages` enforces the key). The original 1,440-a-day path is gone: a pending invite now yields at most 10 emails. Static review only; not exercised against a database.

## Independent review

**Status:** passed
**Target commit:** e8de72bddfb189a13f312f5d4fbb0596f207b515
**Base commit:** b89d41aaf88005de7a24a92c55de03e892275356
**Base ref:** refs/remotes/origin/dev
**Spec hash:** 8d56b70c313b4ff972ca425d7d22abc6600afb0099d890f4a5358098591bf157
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-10-22T10:29:44Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-22T10:31:29Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Handoff

Review the active spec and the complete `b89d41aaf88005de7a24a92c55de03e892275356..e8de72bddfb189a13f312f5d4fbb0596f207b515` delta in a fresh
session or isolated subagent without the builder conversation. Run all Audit lenses from scratch.
Run Check when required above. Do not edit product code, accept findings, or
reuse the existing findings as the review scope.

### Commands

- `git rev-parse HEAD`: pass (equals target)
- `git merge-base refs/remotes/origin/dev HEAD`: pass (equals base commit)
- `shasum -a 256 blueprint/context/current-feature.md`: pass (equals spec hash; spec is tracked, no snapshot needed)
- `git status --porcelain --untracked-files=all`: pass (only `blueprint/context/review.md` differs)
- `npm run typecheck`: pass
- `npm run lint:web`: pass
- `npm run build:web`: pass
- `deno check supabase/functions/send-family-invite/index.ts`: unavailable (Deno not installed)
- `npx supabase@latest db reset` / `db lint`: unavailable (owner does not run the local stack; not run by instruction)

### Evidence

- Reviewed all 10 changed files in the delta: migration, Edge Function, dashboard action, EN/FR strings, database types, findings, spec, project plan, and overview TODO.
- `mark_family_invite_sent` selects the inviter's row `for update`, checks availability, then `send_count >= 10` (`send_limit`), then the 60-second throttle, and updates `last_sent_at` and `send_count` together, so concurrent sends serialize on the row lock.
- `send_count` is excluded from the `authenticated` column-select grant, and `family_invites` has no client insert, update, or delete grant, so clients cannot read or reset the counter.
- `create_family_invite` cap changed from `>= 5` to `>= 10` under the existing per-caller advisory lock; comments match.
- The Edge Function adds `send_limit` (429) to `ErrorCode`/`STATUS` and maps it; `inviteErrorMessage` maps it to `errors.sendLimit`; `fr: Messages` makes the French key compile-time required; copy matches the spec exactly.
- `database.types.ts` adds `send_count` to Row, Insert (optional), and Update (optional) in the generator's format.
- No other code reads the 5-invite number; the dashboard selects explicit granted columns only.
- Tests lens: no test command is configured (AGENTS.md), so no automated coverage exists for the new limit.

### Findings

- F-14 [P2] closed: repair verified in this pass.
- No new findings. F-12 (P3, open) still applies as the spec notes: a failed provider send consumes one of the 10 sends.

### Remaining risk

- Migration and function are not exercised against any database: `supabase db reset`, `db lint`, and runtime calls were not run.
- The Edge Function was not type-checked (`deno check` unavailable; it is outside the npm workspaces typecheck).
- Not verified here that `20261020102645_family_invites.sql` is still unpushed to staging (`migration list` needs network); editing it in place is safe only if it is unpushed.
- `database.types.ts` was hand-edited; regenerate it from staging after the push to confirm it matches, as the spec says.
- No unit or integration test runner is configured, so the send and invite limits have no automated tests.

## Completion notes

- Staging: `npx supabase@latest db push` applied all 4 pending migrations to `tango-staging` on 2026-10-22 with the owner's approval (`migration list` shows local and remote identical). The function was not deployed (Resend secrets not yet set).
- Types: `gen types typescript --linked` from staging matches the hand-edited `database.types.ts` at the type level (every table's Row, Insert, Update, and Relationships, plus Functions, Views, and graphql_public, checked with `tsc`). Only generator formatting differs, so the committed file was kept.
- `npm run typecheck`, `npm run lint:web`, `npm run build:web`: pass.

## Try it now

1. Set the `RESEND_API_KEY` and `INVITE_FROM_EMAIL` Edge Function secrets on `tango-staging`, then deploy `send-family-invite`.
2. Run `npm run dev:web` (pointed at staging) and sign in as a parent without a family.
3. Send an invite, then press **Send again** once a minute. After the 10th email the next press shows "This invite has been sent 10 times, the most allowed."
4. The 11th new invite within 24 hours shows "You've sent 10 invites today. Try again tomorrow."
