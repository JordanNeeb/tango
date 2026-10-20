# Tango - Project Overview

<!-- blueprint:source-hash 8ecd4cfd48b3b024d49e705e1e41f3ec9c06e43a0a36aded1c7a834e2e008c81 -->

> A Canadian, bilingual co-parenting app (web first, then iOS and Android) that
> gives separated parents a permanent court-ready record of messages and calls,
> a calendar that enforces their agreement, and shared expenses and child
> support paid by Stripe pre-authorized debit.

## Problem

Texts, email, and e-Transfers leave separated parents no reliable record and
hold no one to what was agreed. Tango competes with OurFamilyWizard (OFW) and
TalkingParents, priced about 20% below OFW and free for low-income parents who ask.

## Users

- **Parents** - separated or divorced parents in Canada sharing children, often
  in high conflict. Each has their own account and subscription.
- **Family** - one co-parent pair plus their shared children. A parent may
  belong to several families (one per co-parent). A family exists only once the
  invited co-parent accepts.
  - One co-parent: no switcher; the header shows the parent's own name.
  - Two or more: the header menu shows the selected co-parent; its dropdown
    lists every co-parent (click switches the active family, remembered in the
    browser, not on the account) plus Your profile and Sign out (assumption).
  - Deleting a co-parent (Settings > Co-parents, typing their name) only hides
    that family from the deleting parent; nothing is erased and it can be
    restored there. The other parent keeps full access, can keep messaging, and
    is not notified (assumption).
- **Professionals** - lawyers, mediators, other family-law professionals. Free
  accounts, no credential check; they see a family only when a parent invites
  them, read-only, limited to granted areas.
- **Parent access states:**
  - *Unpaired* - no family yet; not charged.
  - *Active subscriber* - access per tier (see Monetization); card collected at onboarding, first charge when the co-parent joins.
  - *Fee waiver* - free for one year on honour-system request approved by the owner.
  - *Lapsed* - can read everything, export, play back recordings, approve or
    deny the other parent's requests and expenses; debits keep running; cannot
    send messages, place calls, create bookings or requests, or enter expenses.
    A lapse never hurts the other parent.
- **Deferred:** family helpers (calendar only).

## Usage model

- Internet-facing, **Canada only in v1**, English and French.
- **Parents may be adversarial.** A parent must never read another family's
  data, alter shared history, or act for the other parent; professionals see
  only granted families and areas. Enforce with Supabase RLS, not only the UI.
- Append-only records: nothing is hard-deleted or edited (conversations,
  messages, access log, calls, exports, agreement versions, requests, expenses,
  payment history). One exception: call recording and transcript files are
  deleted 3 years after the call; the call record stays.
- Payments in scope; card and bank details stay with Stripe.
- Admissibility target: Canada Evidence Act ss. 30, 31.1-31.8 and provincial
  acts; records practices aligned with CAN/CGSB-72.34-2024.
- **Non-requirements for v1:** two-factor auth, international markets
  (including the US), professional credential checks, transaction fees.

## Features

In build-plan order. Headline differentiators: **6-7, 32, 17** (permanent,
verifiable record), **10-11** (agreement enforcement), **13-15** (real payments).

**Foundation** (done)
1. **Monorepo structure** - npm workspaces: `apps/web`, `apps/mobile`, `packages/shared`.
2. **Supabase foundation** - local and staging, profiles, families, membership with RLS.
3. **Web authentication** - 3a email and password, 3b Google; same profile.
4. **Bilingual foundation** - shared EN/FR dictionaries, `profiles.language`, language menu and dashboard Settings.
24. **Landing page and dashboard** - public `/`, `/dashboard` shell.

**Onboarding** (31 done; screens in order: family or practitioner, tier, sign up, payment, add or accept co-parent)
31. **Onboarding flow** - family-or-practitioner choice and step routing into the existing sign-up; practitioners skip tier and payment and land on a placeholder home.
16. **Tiered subscriptions** - tier selection step, Stripe Billing in CAD, card collected at onboarding, first charge when the co-parent joins, lapsed restrictions.
5. **Family pairing** - final onboarding step.
    - 5a. **Co-parent invites** - invite by email or accept an invite; family created on acceptance; duplicates blocked.
    - 5b. **Children** - add children to the family.
    - 5c. **Co-parent switching and settings** - header co-parent switcher with two or more co-parents; Settings > Co-parents deletes (hides) after typing the name and restores.

**Messaging**
6. **Subject conversations** - parent-titled conversations in one scrollable list, never closed; server timestamps; attachments (tier 1 1 GB cap); no edits or deletes.
7. **Access log and tamper evidence** - first-viewed timestamps shown to both parents; append-only log of sign-ins, views, replies; hash chain.
8. **Message search** - EN/FR keyword search over subjects and messages; date, sender, attachment filters; jump to result.
25. **AI tone meter** - flags hostile wording while writing and suggests a rewrite; never blocks.

**Agreements and calendar**
9. **Shared calendar** - schedule patterns, custom cycles, handoff time, general events.
10. **Agreements** - structured calendar terms and allowance, signed document, mutual acceptance, versions.
11. **Calendar enforcement** - overnight allowance tracking, bookings, approve/deny requests and swaps.

**Expenses and payments**
12. **Expenses** - receipt, agreement split, approve/reject, settled outside Tango.
13. **Stripe onboarding** - Connect accounts for receivers, ACSS PAD mandates for payers.
14. **Expense payments** - approval triggers debit; webhook-driven status.
15. **Recurring child support** - mutually accepted schedule with automatic debits.

**Subscriptions**
29. **Fee waivers** - honour-system request linked from the tier step, owner approves or denies, one year.

**Calls**
26. **Voice and video calls** - Agora calls without sharing numbers; every call logged; tier 1 limit of 60 video and 240 voice minutes placed per month.
27. **Call recording** - tier 3 caller opts in per call; both consent before connecting; transcribed; both parents (and granted professionals) can play back; files kept 3 years.

**Exports, professionals, notifications**
32. **Signed exports** - Adobe-trusted (AATL) OV organization seal applied by a Supabase Edge Function; the private key never leaves Azure Key Vault.
    - 32a. **Signing key and certificate** - setup guide and check script: RSA key generated in Key Vault (Premium or Managed HSM, FIPS 140-2 L2+) with key attestation; SSL.com OV document signing certificate; issued chain imported into the vault.
    - 32b. **Signing function** - hashes the PDF's signed byte range (SHA-256), signs only the hash in Key Vault via a service principal from Supabase secrets, embeds signature, chain, SSL.com trusted timestamp, and revocation data (LTV) so Acrobat Reader shows a valid seal.
17. **Court-ready export** - EN/FR PDF of conversations, access log, calls, requests, agreements, payments; sealed by 32 and delivered to web and mobile. Replaces the earlier verification-code and public verification page plan.
28. **Professional portal** - free accounts, parent invitation per family, granted areas, exports, full logging, revocable.
18. **Email notifications** - messages, requests, approvals, calls, payments; never message text.

**Mobile (last, parity with web)**
19. **Mobile foundation** - auth, shared packages, translations, styling.
20. **Mobile messaging, calls, and push** - conversations, search, tone meter, calls, push.
21. **Mobile calendar and requests** - schedule, bookings, approvals.
22. **Mobile expenses and payments** - expenses, approvals, payment status.
23. **Mobile subscription, export, and release** - subscription, export, EAS submission.

## Data model

Postgres in Supabase. All ids `uuid`; all timestamps `timestamptz` set by the
server. Family-owned tables carry `family_id` with RLS on `family_members`
(plus active professional grants for granted areas). Append-only tables allow
no `UPDATE`/`DELETE` of content.

> Locked early (features 2, 5, 6, 7): family scoping, the append-only
> conversation and message shape, and the access log. Later features depend on them.

### profiles
- `id` (= `auth.users.id`), `name` (text, nullable, 1-100), `language` (`'en' | 'fr'`, default `en`), `created_at`
- name required before sending an invite (5)

### families / family_members
- `families`: `id`, `time_zone` (IANA), `created_at`; created only on invite acceptance
- `family_members`: `family_id`, `user_id`, `joined_at`, `hidden_at` (nullable; set when this parent deletes the co-parent, cleared on restore; hides the family from this parent only); unique pair; exactly two parents in v1

### family_invites
- `id`, `invited_email`, `invited_by`, `status` (`pending | accepted | expired`), `created_at`
- blocked when the parents share a family or a pending invite exists either way; acceptance needs a verified email

### children
- `id`, `family_id`, `name`, `birthdate` (date)

### conversations (append-only)
- `id`, `family_id`, `subject` (text), `started_by`, `created_at`; never closed or hidden

### messages (append-only)
- `id`, `family_id`, `conversation_id`, `sender_id`, `body`, `created_at` (server), `seq` (bigint)
- `prev_hash`, `hash` - chain over (prev_hash, sender, conversation, body, attachments, created_at)
- search vector covering EN and FR (subject included via conversation)
- `message_attachments`: `id`, `message_id`, `storage_path`, `mime_type` (image or PDF), `size_bytes`
- `message_reads`: `message_id`, `reader_id`, `first_viewed_at` - shown to both parents

### access_log (append-only)
- `id`, `family_id` (nullable for sign-ins), `actor_id`, `actor_role` (`parent | professional`)
- `event` (`sign_in | message_view | message_reply | export | call_event | professional_action`), `subject_type`, `subject_id`, `created_at`, `data` (jsonb)
- parents do not see each other's sign-ins or repeat views in the app; included in exports, affidavits, professional portal

### calls and call_recordings
- `calls`: `id`, `family_id`, `caller_id`, `callee_id`, `kind` (`voice | video`), `started_at`, `answered_at`, `ended_at`, `recorded` (bool)
- `call_events`: `call_id`, `user_id`, `event` (e.g. mute, unmute), `created_at`
- `call_recording_consents`: `call_id`, `user_id`, `consented_at` - both required before connecting
- `call_recordings`: `call_id`, `storage_path`, `transcript`, `duration_s`, `created_at`, `delete_after` (created + 3 years); files removed after that, row kept with the deletion logged
> TODO: recording storage location (Supabase Storage or object storage in Canada).

### exports (append-only)
- `id` (export ID), `family_id`, `generated_by`, `generated_at`, `range_start`, `range_end`, `language`
- `areas` (text[]), `latest_message_hash`, `pdf_sha256` (of the final signed PDF)
- internal audit record; anyone checks a copy through the PDF's digital seal, not a Tango page

### professional_accounts and professional_grants
- `professional_accounts`: `user_id` (= `profiles.id`), `created_at`; created by a trigger when `profiles.account_type` becomes `professional`; no professional types; name lives on `profiles` (built in 31b)
- `professional_grants`: `id`, `family_id`, `professional_id`, `granted_by`, `areas` (text[]), `status` (`invited | active | revoked`), `created_at`, `revoked_at`
- the other parent is notified and sees every grant

### agreements and agreement_versions (append-only)
- `agreement_versions`: `id`, `agreement_id`, `version`, `proposed_by`, `created_at`, `document_path`
- terms: `schedule_pattern` (`week_on_week_off | 2_2_3 | 2_2_5_5 | alternating_weekends | custom`), `custom_cycle` (jsonb), `handoff_time`, `anchor_date`, `vacation_overnights_per_year` (jsonb per parent), `expense_split` (jsonb percent per parent)
- `agreement_responses`: `version_id`, `user_id`, `response` (`accepted | disputed`); in force only when both accepted

### calendar_events and calendar_requests
- `calendar_events`: `id`, `family_id`, `created_by`, `kind` (`booking | event`), `starts_at`, `ends_at`, `title`, `child_ids` (empty = all), `overnights`, `request_id`
- `calendar_requests`: `id`, `family_id`, `requested_by`, `kind` (`over_allowance | swap`), `starts_at`, `ends_at`, `child_ids`, `details`, `status` (`pending | approved | denied`), `decided_by`, `decided_at`
- allowance usage derived per (family, parent, calendar year); resets January 1

### expenses
- `id`, `family_id`, `logged_by`, `amount_cents` (CAD), `category`, `incurred_on`, `description`, `receipt_path` (required)
- `split` (jsonb), `status` (`submitted | approved | rejected`), `decided_at`, `reject_reason`, `settlement` (`unpaid | stripe | outside_tango`)

### payments
- `stripe_accounts`: `user_id`, `stripe_account_id`, `onboarding_status`
- `payment_mandates`: `id`, `user_id`, `stripe_payment_method_id`, `stripe_mandate_id`, `status`
- `payments`: `id`, `family_id`, `payer_id`, `payee_id`, `amount_cents`, `source` (`expense | support`), `stripe_payment_intent_id`, `status` (`pending | paid | failed | disputed`); `payment_events` history append-only
- `support_schedules`: `id`, `family_id`, `payer_id`, `payee_id`, `amount_cents`, `frequency`, `start_date`, `version`; both parents accept

### subscriptions and fee_waivers
- `subscriptions`: `user_id`, `tier` (`1 | 2 | 3`), `interval` (`month | year`), `status` (`awaiting_coparent | active | lapsed`), `current_period_end`, Stripe customer, payment method, and subscription ids; charging starts when the first family is created
- tier 1 usage: placed call minutes per billing month (video, voice) and document storage bytes (attachments and agreement documents, never receipts)
- `fee_waivers`: `id`, `user_id`, `reason` (`social_assistance | legal_aid | financial_hardship | safety`, nullable), `note`, `status` (`pending | approved | denied`), `decided_by`, `decided_at`, `starts_on`, `ends_on`

### activity_log (append-only)
- `id`, `family_id`, `actor_id`, `action`, `subject_type`, `subject_id`, `created_at`, `data` (jsonb)

## Tech stack

- **Monorepo** - npm workspaces; `packages/shared` holds types, validation, business rules, and translations.
- **Next.js + TypeScript + Tailwind CSS + Catalyst UI kit** - web, the full v1 client; hosts Stripe webhooks.
- **Expo SDK 57 + React Native + Expo Router** - mobile, built last. Styling TODO (NativeWind likely).
- **Supabase** (`ca-central-1`) - Postgres, Auth, Storage, RLS.
- **Agora** - voice and video calls and cloud recording (about $1.49 per 1,000 audio minutes, $5.99 per 1,000 HD video minutes, plus call minutes).
- **AI provider** - tone meter. TODO: provider and model.
- **Stripe** - Connect + ACSS PAD for expenses and support; Billing for tiered subscriptions in CAD; Tax for GST/HST/QST (assumption).
- **Resend or Postmark** - transactional and Supabase Auth email.
- **Export signing** - Supabase Edge Function (Deno, TypeScript); RSA key in Azure Key Vault (Premium or Managed HSM); SSL.com OV AATL document signing certificate (~US$299/year, no per-signature fees).
- **Supabase cron or Vercel cron** - support debits, allowance resets, payment status checks, fee waiver expiry.
- **Expo push** - mobile notifications.

## Monetization

| Tier | Monthly | Annual |
|---|---|---|
| 1 | $11.99 | $119.99 |
| 2 | $17.99 | ~$179.99 |
| 3 (top) | $24.99 | ~$249.99 |

- Per parent, covering any number of families; annual about 17% off.
| Included | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Messaging, tone meter, calendar, agreements, expenses, payments, signed PDF exports | Yes | Yes | Yes |
| Calls placed per month | 60 min video, 240 min voice | Unlimited | Unlimited |
| Document storage (receipts never count) | 1 GB | Unlimited | Unlimited |
| Certified records (affidavits) | No | Unlimited | Unlimited |
| Call recording and transcription, kept 3 years | No | No | Yes |

- No free trial. The card is collected in onboarding; the first charge is when the co-parent joins.
- Fee waivers: honour system, owner approval, one year, tier 1 plus unlimited calling (assumption).
- Professionals are always free. Transaction fees later.

## UI/UX

- Design owned by the project owner: every UI element from the Tailwind Plus Catalyst UI kit (`design/references/tailwind-plus/catalyst-ui-kit/`), other Tailwind Plus references only where Catalyst has no fit; colours, logo, and branding set manually.
- All UI, emails, notifications, and exports in English and French. Language menu on landing and auth pages; Settings > Language on the dashboard.
- `/` landing (signed out), `/dashboard` (signed in); the logo always links home.
- Main web screens (routes decided in feature specs): family setup and invite, children, conversations with search and tone meter, calls, calendar with requests, agreements, expenses, payments, support schedule, subscription and fee waiver, export, professional portal, Settings (language, Co-parents).

## Deployment

- **Web:** Vercel; functions pinned to the nearest Canadian or US-East region (verify in `/release`).
- **Backend:** Supabase `ca-central-1`; staging and production; Supabase CLI locally.
- **Stripe:** test mode in staging, live in production. **Mobile:** EAS Build and Submit.
- **Env vars:** Supabase URL and keys, Stripe secret, publishable, and webhook keys, email provider key, Agora app ID and certificate, AI provider key, Azure service principal (tenant ID, client ID, client secret), Key Vault URL and key name.
- Nothing provisioned yet (Vercel, Supabase staging and production, Stripe, email, Agora, AI provider, Azure Key Vault, SSL.com certificate with organization vetting, domain, Apple and Google developer accounts).
- **Pre-launch (not features):** Law 25 privacy impact assessment (Stripe, email, push, Agora, AI provider, Supabase subprocessors); privacy policy and terms with recording consent; CGSB-aligned records-management policy; named records custodian and affidavit template; privacy and family-law lawyer review.

> TODO: build/start commands and health path (`/release`).

## Open questions

> Resolve in the plans, then re-run `/overview`.

- **Recording storage location**; affidavit turnaround and whether tier 1 can buy one.
- **Fee waiver link** in the tier step arrives with 29, after onboarding ships.
- **Tone meter** - AI provider, whether drafts are kept, whether warnings are logged.
- **Hash chain scope** - per family or per conversation (feature 7).
- **Two logs** - `access_log` and `activity_log` overlap; decide whether one replaces the other.
- **Notification timing** - invites (5), booking notices (11), failed debits (14), and professional grants (28) need email before item 18.
- **Fee waiver approval** - owner-only page or Supabase Studio.
- **Lapsed parents receiving calls** - placing is blocked; receiving is unspecified.
- **Subscription sales channel** - in-app purchase vs web (16, 23).
- **Expense split entry** - stored in agreement terms, but item 10 covers only calendar terms.
- **Receiving parent not onboarded to Stripe** when an expense is approved.
- **Family time zone** - who sets it and when.
- **Assumptions to confirm:** attachments, children fields, access-log visibility, call event detail, professional area limits, Stripe Tax, tier 1 minute reset and at-cap behaviour, 30-day recording deletion notice.
- **Record retention** after account closure; launch scale; success criteria; mobile styling, tone, light/dark mode.
