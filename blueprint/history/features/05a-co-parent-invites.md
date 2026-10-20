# Feature: Co-parent invites

**From build-plan:** feature 5a
**Build attempt:** 1
**Branch:** feature/co-parent-invites

## Goal

A parent without a co-parent lands on a dashboard welcome page that invites
them to add their co-parent by email. Tango emails the invite through a
Supabase Edge Function (Resend in staging and production, Mailpit locally).
Following the link is the co-parent's acceptance (per the owner): signed in,
the invite is accepted at once; signed out, they create an account with their
email already filled in (or sign in) and the invite is accepted as soon as they
are signed in. Accepting creates the family with both parents. Invites expire
after 7 days.

## Design reference

- Welcome section: `design/references/tailwind-plus/marketing/cta-dark.jsx`
  (both themes; `cta-light.jsx` is its light half), per the owner. Its two links
  are replaced by an email field (visually hidden label, placeholder) and the
  invite button in one row; the pending invite and any invite-link error sit
  in the same spot. The heading has no user name (per the owner).

## In scope

- `family_invites` table and database functions to create, re-send, look up,
  and accept invites, enforcing the plan's rules: name required, no duplicate
  pairing, no pending invite either way, verified matching email to accept.
- Edge Function `send-family-invite` that emails one invite, bilingual (English
  then French), with a link to `/auth/invite/<token>`.
- Dashboard welcome page for parents with no family: invite form, or the
  pending invite they sent (with Send again), plus the reason an invite link
  couldn't be accepted. No popup, no Later button, and no accept step.
- `/auth/invite/<token>` route (no page): accepts for a signed-in parent;
  otherwise remembers the invite in a cookie and opens sign-up with the invited
  email filled in. Email confirmation, password sign-in, and Google sign-in
  accept a remembered invite.
- English and French copy.

## Out of scope

- Sign-up with a different email than invited: the invite then won't match and
  the inviter sends a new one (per the owner; change-of-email handling later).
- Cancelling an invite, inviting from anywhere but the welcome page, and inviting
  a second co-parent once a family exists (5c and later).
- Children (5b), co-parent switching and settings (5c).
- The tier step for invited parents: `/pricing` doesn't persist a tier yet and
  payment (16b) waits on company registration, so the invite link goes straight
  to sign-up.
- Notification emails other than the invite (18). Mobile.
- Provisioning Resend and its sending domain for staging (an external setup
  step, listed under Notes).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is `disabled`:
implement all steps, verifying each one's Done when, then present one review
packet. No checkpoint commits; `/complete` makes the feature commit.

## Build steps

- [x] **1. Schema.** New migration `family_invites`:
  - Table `public.family_invites`: `id uuid pk default gen_random_uuid()`,
    `token uuid not null unique default gen_random_uuid()`, `invited_by uuid not null references profiles(id) on delete restrict`,
    `invited_email text not null` (stored lowercase, trimmed), `time_zone text not null`,
    `status text not null default 'pending' check (status in ('pending','accepted'))`,
    `family_id uuid references families(id) on delete restrict` (set on accept),
    `created_at timestamptz not null default now()`,
    `expires_at timestamptz not null default now() + interval '7 days'`,
    `last_sent_at timestamptz`, `accepted_at timestamptz`.
    Index on `lower(invited_email)` and on `invited_by`.
  - RLS on; policy: inviters read their own rows (`invited_by = auth.uid()`).
    `revoke all ... from anon, authenticated`; `grant select` to authenticated.
    No client insert, update, or delete.
  - `public.create_family_invite(email text, time_zone text) returns uuid`,
    `security definer`, `search_path = ''`. Raises with these messages (errcode
    `P0001`, mapped by the web): `name_required` (caller's `profiles.name` is
    null), `not_parent` (caller's `account_type = 'professional'`),
    `invalid_email` (fails a simple `^[^@\s]+@[^@\s]+\.[^@\s]+$` check),
    `self_invite` (matches the caller's own email), `invalid_time_zone` (not in
    `pg_timezone_names`), `already_paired` (a user with that email already
    shares a family with the caller), `pending_exists` (an unexpired pending
    invite exists from the caller to that email, or from that email's user to
    the caller's email). Otherwise inserts and returns the id.
  - `public.mark_family_invite_sent(invite_id uuid) returns void`, `security definer`:
    only the inviter, only a pending unexpired invite; raises `too_soon` when
    `last_sent_at` is under 60 seconds ago, else sets `last_sent_at = now()`.
    This is the throttle for every email send.
  - `public.get_family_invite(invite_token uuid)` returns `inviter_name,
    invited_email, expired boolean` for the signed-out link redirect; callable by `anon` and
    `authenticated`; returns no row for an unknown token or an accepted invite.
  - `public.accept_family_invite(invite_token uuid) returns uuid` (the family id),
    `security definer`: locks the invite row (`for update`), then raises
    `invite_unavailable` (not found, not pending, or expired), `email_mismatch`
    (caller's confirmed email differs), `not_parent`, `self_invite`, or
    `already_paired`; otherwise, in one transaction, inserts `families` with the
    invite's `time_zone`, both `family_members` rows, and sets the invite
    `accepted`, `family_id`, `accepted_at`.
  - Grants: execute on all four to `authenticated`; `get_family_invite` also to
    `anon`; revoke from `public`. Apply with `migration up`, `db lint`,
    regenerate types.
  - Done when: lint passes; rolled-back SQL checks show each raise above, a
    successful create, the 60-second throttle, get results, an accept
    that creates one family with both members, a second accept refused, an
    expired invite refused, and that a user can't read another user's invites.
- [x] **2. Invite email function.** `supabase/functions/send-family-invite/index.ts`
  (Deno, `npm:@supabase/supabase-js`). Requires the caller's JWT (default
  `verify_jwt`). Body `{ inviteId }`. With a client using the caller's
  Authorization header: call `mark_family_invite_sent` (ownership and
  throttle), read the invite (`token`, `invited_email`) under RLS, and the
  inviter's `name`. Build `${SITE_URL}/auth/invite/${token}` and an email with
  subject "Join your co-parent on Tango / Rejoignez votre coparent sur Tango",
  English then French, inviter name HTML-escaped, the 7-day expiry stated.
  Send with Resend (`RESEND_API_KEY`, `INVITE_FROM_EMAIL`) when the key is set,
  otherwise to local Mailpit's send API (`MAILPIT_URL`). Responses:
  `200 {}`; `400 { error: "invalid_request" }`; `429 { error: "too_soon" }`;
  `404 { error: "invite_unavailable" }`; `502 { error: "send_failed" }`.
  Secrets come from env; the local values go in `supabase/functions/.env`
  (git-ignored) with a committed `supabase/functions/.env.example`.
  - First confirm the local edge runtime reaches Mailpit's send API
    (`http://supabase_inbucket_tango:8025/api/v1/send` or the CLI's equivalent);
    if it can't, stop and revise the spec rather than adding an SMTP library.
  - Done when: invoking the function for a fresh invite puts the bilingual email
    in Mailpit with the right link; a second call within 60 seconds returns 429;
    another user's invite id returns 404.
- [x] **3. Welcome page and sending.** `dashboard/page.tsx` reads whether the
  parent has a family (`family_members` for `claims.sub`). A parent with none
  gets `ParentWelcome` inside `ParentDashboard` instead of empty content; a
  parent with a family keeps today's dashboard. `ParentWelcome` (copy below)
  shows:
  - the message for `?invite=<code>` after a failed link accept (step 5);
  - the invite they sent, if pending and unexpired: "Invite sent to <email>,
    expires <date>" with Send again;
  - otherwise the invite form: co-parent email field and Send invite button.
  - Server actions in `app/[lang]/dashboard/actions.ts`: `sendInvite` validates
    the email (`validateEmail`), takes the time zone from a hidden field filled
    by the browser (`Intl.DateTimeFormat().resolvedOptions().timeZone`, falling
    back to `America/Toronto` when empty), calls `create_family_invite`, then
    `supabase.functions.invoke("send-family-invite")`; `resendInvite` invokes the
    function for the pending invite. Each RPC and function error code maps to a
    message; anything else is logged and shows `auth.errors.unexpected`. If the
    invite is created but the email fails, the pending card shows the send error
    and Send again. `revalidatePath("/dashboard")` after success.
  - Form behaviour follows the auth forms: label, `aria-describedby` field
    error, `FormAlert` for form errors and the sent notice, focus on first error.
  - Done when: a new parent sees the welcome page; sending shows the pending
    card and the email arrives in Mailpit; each error message appears for its
    case (no name links to `/profile`); Send again within 60 seconds shows the
    wait message; a professional still sees the professional dashboard.
- [x] **4. Invite link and prefilled sign-up.** (Revised per the owner: the
  invite page and the Accept button were removed; following the link accepts.)
  - `app/auth/invite/[token]/route.ts` (GET). Non-UUID or unknown/accepted
    token: `/sign-in?error=invite-unavailable`. Signed in: `accept_family_invite`
    then `/dashboard` (or `/dashboard?invite=<code>` on failure). Signed out and
    expired: `/sign-in?error=invite-expired`. Signed out otherwise: set the
    `tango_invite` cookie and redirect to `/sign-up?type=parent&email=<invited email>`.
  - Sign-up page passes a valid `email` search param to `SignUpForm` as the
    email field's default value (still editable).
  - Done when: the Mailpit link opens sign-up with the email filled in; unknown
    and expired links show their sign-in messages; a signed-in parent with the
    invited email is paired straight away.
- [x] **5. Accepting after sign-up or sign-in.** `lib/invites.ts` holds the
  cookie and `acceptInviteToken`. `/auth/confirm` (type `email`), the `signIn`
  action, and `/auth/callback` (Google) accept a remembered invite, delete the
  cookie, and redirect to `/dashboard` (or `/dashboard?invite=<code>`). The
  dashboard maps `invite_unavailable`, `email_mismatch`, `self_invite`, and
  `unexpected` to messages on the welcome page; other codes show nothing.
  - Done when: a new co-parent signs up from the link, confirms through
    Mailpit, and lands on the parent dashboard paired; an existing parent signs
    in from the link and is paired; another account following the link sees
    "sent to another email address"; Studio shows each family with both members;
    `npm run typecheck`, `npm run lint:web`, `npm run build:web`, and
    `npx supabase@latest db lint` pass.

- [x] **6. Repair F-10.** Clients can no longer read `family_invites.token`:
  `authenticated` gets `select` on every column except `token`, and
  `send-family-invite` reads the token with the service-role key only after
  `mark_family_invite_sent` has confirmed the caller sent the invite.
  - Done when: as the inviter, selecting `token` (or `*`) through PostgREST is
    refused; the dashboard's columns still read; the function still sends the
    email with the right `/auth/invite/<token>` link; typecheck, lint, build,
    and schema lint pass.
  - Fixes: F-10

- [x] **7. Repair F-11: invite cap.** Per the owner, `create_family_invite`
  raises `invite_limit` when the caller already created 5 invites in the last
  24 hours (a per-caller advisory lock keeps concurrent requests from passing
  together). The web maps it to `errors.inviteLimit`.
  - Done when: rolled-back SQL creates 5 invites, refuses the sixth with
    `invite_limit`, and allows another once one is older than 24 hours;
    typecheck, lint, build, and schema lint pass.
  - Fixes: F-11

## Files / areas

- `supabase/migrations/<timestamp>_family_invites.sql` - new
- `supabase/functions/send-family-invite/index.ts` - new
- `supabase/functions/.env.example` - new (names only)
- `supabase/config.toml` - only if the function needs a `[functions.send-family-invite]` entry
- `packages/shared/src/database.types.ts` - regenerated
- `packages/shared/src/i18n/en.ts`, `fr.ts` - `dashboard.welcome`, `invite` copy
- `apps/web/src/app/[lang]/dashboard/page.tsx` - family check
- `apps/web/src/app/[lang]/dashboard/actions.ts` - new
- `apps/web/src/components/dashboard/parent-dashboard.tsx` - takes content
- `apps/web/src/components/dashboard/parent-welcome.tsx` - new (and small client form components beside it as needed)
- `apps/web/src/app/auth/invite/[token]/route.ts` - new
- `apps/web/src/lib/invites.ts` - new
- `apps/web/src/app/auth/confirm/route.ts`, `app/auth/callback/route.ts`, `app/[lang]/(auth)/actions.ts` - accept a remembered invite
- `apps/web/src/app/[lang]/(auth)/sign-in/page.tsx` - invite link errors
- `apps/web/src/app/[lang]/(auth)/sign-up/page.tsx`, `components/auth/sign-up-form.tsx` - prefilled email

## Data / contracts

- **Invite lifecycle:** `pending` until accepted; expired means `pending` with
  `expires_at <= now()` (no job flips it). After expiry the inviter sends a new
  invite. `accepted` is final and records `family_id`.
- **Matching:** emails compare lowercase and trimmed. Accepting needs the
  caller's confirmed account email to equal `invited_email`. Google accounts
  count as confirmed.
- **Token secrecy:** only the email function (service role) reads tokens;
  clients have no `select` on that column, because following the link accepts.
- **Trust:** every function derives the actor from `auth.uid()`; the token
  identifies the invite but never authorizes acceptance on its own, since the
  caller's confirmed email must match. The token and
  invited email are visible to whoever holds the link, which was sent to that
  email.
- **Family time zone:** the inviter's browser time zone at invite time, checked
  against `pg_timezone_names`, copied to `families.time_zone` on accept.
- **One pending invite per pair**, either direction. A parent may still invite
  different people; the welcome page shows only their most recent pending one.
- **Atomicity:** acceptance creates the family, both members, and the invite
  update in one function call with the invite row locked, so two concurrent
  accepts can't create two families.
- **Invite cap:** at most 5 invites created per parent in any 24 hours.
- **Email throttle:** at most one send per invite per 60 seconds, enforced in
  the database before the function sends.
- **Remembered invite:** cookie `tango_invite` (token), httpOnly, `sameSite=lax`,
  `secure` in production, `path=/`, 7 days; deleted after any accept attempt.
- **Function errors:** `{ error: <code> }` with the statuses in step 2; the web
  maps codes to copy and never shows provider messages.
- **Rendering:** inviter name and email render as React text; in the email the
  name is HTML-escaped.
- **Copy** (`dashboard.welcome` and `invite`; plain text, `{name}`, `{email}`,
  `{date}` replaced with a replacer function):

| Key | English | French |
| --- | --- | --- |
| `welcome.title` | Welcome to Tango | Bienvenue sur Tango |
| `welcome.description` | The first step is to add a co-parent. Invite them by email and we'll set up your family as soon as they accept. | La première étape consiste à ajouter un coparent. Invitez-le par courriel et nous créerons votre famille dès qu'il acceptera. |
| `welcome.emailLabel` | Co-parent's email | Courriel du coparent |
| `welcome.send` / `sending` | Send invite / Sending | Envoyer l'invitation / Envoi |
| `welcome.pending` | Invite sent to {email}. It expires on {date}. | Invitation envoyée à {email}. Elle expire le {date}. |
| `welcome.sendAgain` | Send again | Renvoyer |
| `welcome.sent` | Invite sent. | Invitation envoyée. |
| `errors.nameRequired` | Add your name to your profile before inviting your co-parent. | Ajoutez votre nom à votre profil avant d'inviter votre coparent. |
| `errors.selfInvite` | Enter your co-parent's email, not your own. | Entrez le courriel de votre coparent, pas le vôtre. |
| `errors.alreadyPaired` | You're already co-parents with this person. | Vous êtes déjà coparents avec cette personne. |
| `errors.pendingExists` | There's already a pending invite between you and this person. | Il y a déjà une invitation en attente entre vous et cette personne. |
| `errors.tooSoon` | Wait a minute before sending again. | Attendez une minute avant de renvoyer. |
| `errors.inviteLimit` | You've sent 5 invites today. Try again tomorrow. | Vous avez envoyé 5 invitations aujourd'hui. Réessayez demain. |
| `errors.sendFailed` | We couldn't send the email. Try again. | Nous n'avons pas pu envoyer le courriel. Réessayez. |
| `errors.unavailable` | This invite isn't available anymore. | Cette invitation n'est plus disponible. |
| `errors.emailMismatch` | This invite was sent to another email address. | Cette invitation a été envoyée à une autre adresse courriel. |
| `errors.ownInvite` | This is the invite you sent. Your co-parent needs to open it. | C'est l'invitation que vous avez envoyée. Votre coparent doit l'ouvrir. |
| `auth.errors.inviteUnavailable` | This invite isn't available anymore. | Cette invitation n'est plus disponible. |
| `auth.errors.inviteExpired` | This invite has expired. Ask your co-parent to send a new one. | Cette invitation a expiré. Demandez à votre coparent d'en envoyer une nouvelle. |

## Testing

- No test or Verify command is declared, so no unit tests.
- Gates: `npm run typecheck`, `npm run lint:web`, `npm run build:web`,
  `npx supabase@latest db lint`, plus rolled-back SQL checks (step 1) and
  function calls against the local stack (step 2).
- Manual checks on `npm run dev:web` with the local stack running: each Done
  when above, with two test accounts and Mailpit.

## Notes for the AI

- Read the Next.js 16 docs in `node_modules/next/dist/docs/` for dynamic route
  params and `revalidatePath` before steps 3 to 5, and the Supabase Edge
  Functions docs for local secrets before step 2.
- Follow `(auth)/actions.ts` for `ActionResult`, error mapping, and logging;
  follow `sign-up-form.tsx` and `fields.tsx` for form markup and focus.
- Never put the service-role key in the web app; the function uses the
  caller's JWT, so it doesn't need it either.
- Staging needs a Resend account, a verified sending domain, and the function
  secrets set (`npx supabase@latest secrets set`). That remote change needs its
  own approval and isn't part of this feature.
- Never edit an existing migration. No em dashes, en dashes, or ellipsis
  characters in copy or comments.

## Implementation notes

- **Status:** verified. Typecheck, lint, build, schema lint, rolled-back SQL
  checks, live function calls, and Chrome checks against `npm run dev:web`
  with the local stack.
- Live checks (Chrome, `npm run dev:web`): welcome page; empty and own-email
  errors (focus moves to the field); sending (pending card, Mailpit email,
  browser time zone stored); Send again within a minute; French welcome page.
- After the owner's revision (link accepts, no invite page or Accept button,
  new welcome copy): signed-out link opens sign-up pre-filled, then sign-up and
  Mailpit confirmation pair the parents; an existing parent signing in from the
  link is paired; a signed-in parent following their link is paired at once;
  another account's link shows "sent to another email address"; unknown and
  expired links show their sign-in messages; new emails link to
  `/auth/invite/<token>`.
- Not checked live: the no-name state, Google sign-in from a link, and phone
  width.
- The welcome page is the `cta-dark` section (owner's request after the first
  live check), re-checked in Chrome: layout, the empty-email error, and the
  pending state.
- The time zone field is controlled (`useSyncExternalStore`), because React's
  form reset after a submission cleared the uncontrolled one.
- The empty email error uses `dashboard.welcome.emailRequired` ("Enter your
  co-parent's email address.") instead of the sign-in copy.
- The unpushed migration was edited twice (an ambiguous `email` reference; then
  accept by token and no received-invites list) and re-applied to the local
  database by hand, keeping local data.



<!-- blueprint:completion {"schemaVersion":2,"specBytes":20688,"specSha256":"9b9c50c8d567993e810cf935c96d4979dcdf5b8201cb155d76c8ab53a95820d9","branch":"refs/heads/feature/co-parent-invites","head":"3b9c14a7f2f8d007f9b6f143a9612017e70b1a9b","baseRef":"refs/heads/dev","baseCommit":"ef02c3f8dffd2fe44a942bc747c91ed201103b28","sourceTree":"e269be0493478b9ac504117a4bd8d61eba47e830","landing":"local-merge","absentOptional":[]} -->

## Findings

### 5a/F-10 [P1] closed - Inviter can read the invite token, so a cross-site link silently pairs a signed-in invitee

**File:** supabase/migrations/20261020102645_family_invites.sql:26
**Found:** 2026-10-20 by /audit independent (scope: current; lens: security)
**Why it matters:** The select policy and `grant select` (lines 26-32) expose every column of the inviter's own rows, including `token`. Following `/auth/invite/<token>` is the acceptance (`apps/web/src/app/auth/invite/[token]/route.ts:24-25` accepts on a plain GET for a signed-in visitor; signed out, line 37 plants a 7-day cookie that `signIn`, `/auth/callback`, and `/auth/confirm` accept on the next sign-in). So an inviter who knows a parent's email can create an invite, read its token with their own session through PostgREST, and make the victim's browser navigate to the link from any page or disguised link (a top-level GET carries the `SameSite=lax` session cookie). The victim never sees the Tango email, yet is paired: a rolled-back local test confirmed the inviter reads the token under RLS, the victim's `accept_family_invite` then creates the family, and the victim's profile becomes readable to the inviter. Per the plan a family can only be hidden, never removed, the other parent keeps messaging access, and the first charge happens when the co-parent joins (16c). The spec's trust model assumes the token is held only by the email recipient ("visible to whoever holds the link, which was sent to that email"); this breaks the consent boundary for permanent, court-relevant records.
**Suggested fix:** Keep the token out of the inviter's reach. In this (unpushed) migration, replace the table-wide `grant select` with a column list that omits `token` (`grant select (id, invited_by, invited_email, time_zone, status, family_id, created_at, expires_at, last_sent_at, accepted_at) on public.family_invites to authenticated`), and have `send-family-invite` read the token after `mark_family_invite_sent` succeeds (ownership already proven under the caller JWT) with the function's built-in service-role client, or through a `security definer` function executable only by `service_role`. No current requirement is lost; the dashboard does not select `token`.
**Resolution:** Fixed 2026-10-20 in step 6: `authenticated` has column-level `select` without `token`; `send-family-invite` reads the token with the service-role key after `mark_family_invite_sent` succeeds. PostgREST `select=token` and `select=*` now return 42501 for the inviter; the function still sends the correct link. Awaiting `/audit` re-review. Closed 2026-10-20 by /audit independent (target 3b9c14a): migration lines 31-38 grant `authenticated` select on every column except `token` (confirmed in `information_schema.column_privileges`; the local functions match the migration file in a rolled-back re-apply). As an inviter, PostgREST `select=token`, `select=*`, and the filter oracle `token=not.is.null` all return 403/42501, and SQL `order by token` is refused; `select=id,invited_email,status` still works. No realtime publication or pg_graphql exposes the table. `send-family-invite` (`index.ts:105-123`) reads the token with the service-role client only after `mark_family_invite_sent` proved ownership under the caller's JWT; another user's invite id returns 404 with no read. No RPC returns the token. The repair introduced no new defect.

### 5a/F-11 [P2] closed - Invite email can be sent to unlimited addresses with sender-chosen text

**File:** supabase/migrations/20261020102645_family_invites.sql:51
**Found:** 2026-10-20 by /audit independent (scope: current; lens: security, performance)
**Why it matters:** The only throttle is 60 seconds per invite (`mark_family_invite_sent`, line 145). `create_family_invite` has no per-caller limit and only blocks duplicates for the same pair, so one account can create and email invites to any number of addresses (directly through PostgREST and the function, without the web form). Each email comes from Tango's sending domain with the inviter's free-text profile name in the body and plain-text part (`supabase/functions/send-family-invite/index.ts:44-56`; HTML is escaped, but text such as a URL or a phishing line is not limited). In staging and production this spends Resend quota and sender reputation and lets Tango's domain carry arbitrary text to strangers.
**Suggested fix:** Add a per-inviter cap in `create_family_invite` (for example raise `too_many_invites` when the caller created more than a handful of invites in the last 24 hours, counted from `family_invites` with the existing `invited_by` index) and map it to copy. No current requirement is lost.
**Resolution:** Fixed 2026-10-20 in step 7 (owner chose 5 per day): `create_family_invite` raises `invite_limit` at 5 invites in the last 24 hours, serialized per caller with an advisory lock; rolled-back SQL created 5, refused the sixth, and allowed one after the window. Awaiting `/audit` re-review. Closed 2026-10-20 by /audit independent (target 3b9c14a): `create_family_invite` (migration lines 98-107) takes a per-caller advisory transaction lock, counts the caller's invites from the last 24 hours, and raises `invite_limit` at 5; a rolled-back SQL check created 5 and refused the sixth, and the web maps the code to `errors.inviteLimit`. The original defect (unlimited addresses) is gone and the repair introduced no new defect. Repeat sends of the same invites are a separate issue, recorded as F-14.

## Independent review

**Status:** passed
**Target commit:** 3b9c14a7f2f8d007f9b6f143a9612017e70b1a9b
**Base commit:** ef02c3f8dffd2fe44a942bc747c91ed201103b28
**Base ref:** origin/dev
**Spec hash:** 9b9c50c8d567993e810cf935c96d4979dcdf5b8201cb155d76c8ab53a95820d9
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-20T11:15:15Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-20T11:20:03Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

## Commands

- `npm run typecheck`: pass
- `npm run lint:web`: pass
- `npm run build:web`: pass
- `npx supabase@latest db lint`: pass (no schema errors)
- Rolled-back SQL re-apply of `20261020102645_family_invites.sql`: pass (function bodies match the local database)
- Rolled-back SQL checks (token privileges, invite cap, 60-second throttle, accept rules, expiry, get by token): pass
- PostgREST requests as an inviter and as anon against `family_invites`: pass (token refused, other columns readable by the inviter only)
- `send-family-invite` calls with another user's invite id, a malformed body, the anon key, and no auth: pass (404, 400, 502 with no send, 401)

## Evidence

- Freshness: `HEAD` equals the target, `origin/dev` merge base equals the base, spec hash matches, only `review.md` and `findings.md` differ.
- Column grants in `information_schema.column_privileges` exclude `token`; no anon or authenticated table-level grants; no realtime publication or pg_graphql.
- Accept: unconfirmed or different email and the inviter's own link raise `email_mismatch`, a second accept and an expired invite raise `invite_unavailable`, a successful accept creates one family with two members, and a later invite between the pair raises `already_paired`.
- Cap: five creates pass and the sixth raises `invite_limit`; a second mark within 60 seconds raises `too_soon`.
- Web routes reviewed: `/auth/invite/[token]`, `/auth/confirm`, `/auth/callback`, `signIn`, dashboard actions and welcome page, prefilled sign-up; redirects use fixed paths and error codes from the database.

## Findings

- F-10 closed, F-11 closed
- F-14 [P2] open (new): resends limited only to once a minute per invite for 7 days
- F-15 [P3] open (new): no invite result shown to a parent who already has a family
- Carried forward unchanged: F-12 [P3] open, F-13 [P3] unverified

## Remaining risk

- No unit test or Verify command is configured; the SQL and function checks are manual and not repeatable.
- Check was not run (not required); browser flows (Google sign-in from a link, no-name state, phone width) were not exercised by this review.
- Resend delivery, staging secrets (`SITE_URL`, `RESEND_API_KEY`, `INVITE_FROM_EMAIL`), and the hosted edge runtime's service-role key and JWT verification are unverified until staging setup.
- Concurrent accepts and creates were reviewed by reading the row and advisory locks, not by a concurrency test.

## Try it now

1. With the local stack running (`npx supabase@latest start`, which also serves the `send-family-invite` function; copy `supabase/functions/.env.example` to `supabase/functions/.env` first), start `npm run dev:web` and open http://localhost:3000.
2. Sign up as a new parent and confirm the email in Mailpit (http://127.0.0.1:54324). The dashboard shows "Welcome to Tango" with a co-parent email field and an invite button.
3. Enter another address and send. The section changes to "Invite sent to <email>. It expires on <date>." and the invite email arrives in Mailpit.
4. Sign out, then open the email's link. Sign-up opens with the invited email filled in. Create the account and confirm it in Mailpit: you land on the parent dashboard already paired, and the inviter's dashboard no longer shows the welcome section.
5. Signed in as a different parent, open another invite's link: the welcome section says the invite was sent to another email address.
