# Project Plan

> Developed through `/discovery`. Items marked **Assumption** were proposed and
> not objected to; confirm or correct them. Items marked **TODO** are open.

## 1. Problem - What problem are we solving?

Separated and divorced parents have to keep communicating, sharing costs, and
coordinating parenting time, often while in conflict. Informal tools (texts,
email, shared calendars, e-Transfers) leave no reliable record, are easy to
dispute, and do nothing to hold either parent to what they agreed.

Tango is a Canadian co-parenting app and a direct competitor to
OurFamilyWizard (OFW) and TalkingParents. It gives co-parents one place to
communicate, call, plan schedules, and handle shared expenses, with three
differentiators:

- **A permanent, court-ready record.** Messages and calls cannot be edited or
  deleted, are timestamped by the server, every sign-in, view, and reply is
  logged, and exports carry an Adobe-trusted digital seal anyone can check
  in a PDF reader.
- **Agreements the app enforces.** Parents enter the terms of their parenting
  agreement, and the calendar blocks bookings that exceed those terms unless
  the other parent approves.
- **Money that actually moves.** Shared expenses and recurring child support
  are collected through Stripe pre-authorized debit, not just tracked.

It is priced roughly 20% below OurFamilyWizard, and free for low-income
parents who ask.

## 2. Users - Who is this for?

- **Primary:** separated or divorced parents in Canada who share children.
  Many are in high-conflict relationships, so the product must stay neutral and
  assume either parent may act against the other.
- Each parent has their own account and their own subscription.
- A parent may share children with more than one co-parent. Each co-parent
  pair plus their shared children is a separate **family**, and nothing is
  shared between families.
- **Professionals (v1):** lawyers, mediators, and other family-law
  professionals, on free accounts. They see a family only when a parent
  invites them (see Professional portal).
- **Later (not v1):** family helpers (calendar only) invited by a parent (see
  Deferred).

## 3. Features - What does the MVP need?

### Platforms and build order

1. Monorepo foundation
2. Backend (Supabase)
3. Web app (Next.js), the full v1 client
4. Mobile app (Expo, iOS and Android), shipped last and reaching parity with web

### Onboarding

**New in this revision.** New users go through these screens in order:

1. **Family or practitioner.** Practitioners (professionals) skip to step 3;
   they are always free, and land on a placeholder home until the
   professional portal exists.
2. **Select a tier** (see Monetize for the comparison).
3. **Sign up** with email and password or Google (existing sign-up).
4. **Add a payment method.** The card is collected here; the first charge
   happens when the co-parent joins. A parent whose co-parent never joins is
   never charged. No free trial.
5. **Add your co-parent** by email, or, for a parent who arrived from an
   invite, **accept the invite**. Invited co-parents go through the same
   screens; both parents' charges start when the family is created.

### Accounts, families, and children

- Sign up, sign in, sign out, profile via Supabase Auth. Sign-in methods:
  email and password (with email confirmation and password reset) and Google.
  Other providers (Apple, Facebook) later.
- Sign-up asks for name, email and password; Google sign-up uses the name from
  Google. Parents can change their name on their profile; a name is required
  before sending a co-parent invite. Language is chosen from a language menu
  (landing and sign-in pages) or from Settings on the dashboard, not a form
  field.
- Starting a family and inviting the co-parent by email is one step. The
  family is created only when the co-parent accepts, so every family has both
  parents from the start.
- One co-parent pair is one family. An invite between two parents who already
  share a family, or who already have a pending invite between them in either
  direction, is blocked; the parent is pointed to the existing family or invite.
- A parent can belong to multiple families from v1 (one per co-parent).
  - With one co-parent there is no family switcher, and the dashboard header
    shows the parent's own name.
  - With two or more co-parents, the header menu shows the selected
    co-parent's name instead, its dropdown lists every co-parent, and clicking
    one switches the active family. The active family is remembered in the
    browser, not stored on the account. Your profile and Sign out stay in the same
    dropdown. **Assumption.**
  - Co-parent settings live in a Co-parents section of the main Settings page.
  - **Deleting a co-parent** needs the parent to type the co-parent's name. It
    only hides that family from the parent who deleted it: it leaves their menu
    and nothing about it shows on their screens. No data is erased, and the
    Co-parents section can restore it.
  - The other parent keeps full access, can keep sending messages, and is not
    notified; the deleting parent sees those messages once they restore the
    co-parent. **Assumption.**
- Accepting an invite requires a verified email address, since invites are
  matched by email.
- Children: name and birthdate only in v1, added after the family exists.
  **Assumption.**
- English and French throughout: UI, emails, notifications, and PDF export.

### Messaging

**Changed in this revision:** messages are organised into subject
conversations instead of one continuous chat per family.

- **Subject conversations.** A parent starts a conversation by entering a
  subject title and the first message. Both parents reply inside it.
- Conversations appear in **one scrollable list**, most recent activity first.
  They are never closed, archived, hidden, or deleted.
- **No editing and no deleting, by anyone, ever**, for messages and subjects.
  Corrections are new messages.
- Server-assigned timestamps, never device time.
- Attachments: photos, videos, PDFs, and Office documents (Word, Excel,
  PowerPoint), up to 10 files of 50 MB each per message. A message needs text,
  attachments, or both. Attachments are stored permanently, never modified or
  deleted, and included in exports. Clicking one opens it in the app when the
  browser can show it (photos, videos, PDFs) and downloads it otherwise.
- **Photos and files:** each parent can see every photo and file shared with a
  co-parent, like and unlike them (a Liked folder), and archive and unarchive
  them. How a parent organizes files is theirs alone and can always change; it
  never modifies or deletes the files.
- **Message status:** each message keeps the server time it was sent and,
  once each, when the receiving parent's app first loaded it (delivered), first
  alerted them to it outside the conversation (received), first showed its
  text in the conversation list (previewed), first opened its conversation
  (read), and when they first replied after it (replied). The latest message
  shows its status to both parents, except replied, which is kept for court
  exports with the rest. Conversations update live.
- **Access log:** every sign-in, every message view (not only the first), and
  every reply is recorded in an append-only log. Parents do not see each other's
  sign-ins or later views in the app; the log appears in court exports,
  records-custodian affidavits, and the professional portal (the OFW and
  TalkingParents model). **Assumption** (confirmed as "work with this for now").
- Tamper evidence: each message is chained to the previous one with a
  cryptographic hash, so any later change is detectable.
- Search: keyword search in English and French across subjects and messages,
  filters by date range, sender, and has-attachment, jump from a result to its
  place in the conversation, and export a date range to PDF. Smarter search
  (tags, summaries) is later.

### AI tone meter

**Moved into v1 in this revision.**

- While a parent writes, the tone meter flags wording likely to read as
  hostile, aggressive, or humiliating and suggests a calmer rewrite (like OFW's
  ToneMeter).
- It **warns and suggests; it never blocks**. The parent can always send what
  they wrote, and the record shows exactly what was sent.
- Message drafts are sent to an AI provider for analysis, so that provider
  must be in the privacy impact assessment. **TODO:** choose the provider, and
  decide whether drafts are kept or discarded after analysis.
- **TODO:** whether showing a warning, or accepting a rewrite, is itself
  recorded.

### Calls

**New in this revision.**

- In-app voice and video calls between co-parents through **Agora**, without
  sharing phone numbers.
- Every call is logged on every tier: who called whom, when, how long, whether
  it was answered, and in-call events such as muting (as on OFW). **Assumption**
  for the event detail.
- **Recording follows the OFW model:**
  - Only a parent on the **top tier** can record, and only calls they place.
    They choose per call.
  - The caller consents before dialling, and the co-parent must consent before
    the call connects, so a co-parent can decline a recorded call.
  - **Both parents** can play back and export every recording, whatever their
    tier, and so can professionals the family has invited.
  - Recordings are append-only like messages.
- Recorded calls are **transcribed** automatically (tier 3, v1, as on OFW Max).
- **Retention:** recordings and transcripts are kept **3 years from the call
  date**, whatever happens to the subscription afterwards, then the files are
  deleted. The call record stays permanently (who, when, how long, both
  consents, that it was recorded). Both parents get a notice about 30 days
  before deletion so they can download copies (**Assumption**), and the
  deletion is logged in the access log and covered by the records-management
  policy. This is the one exception to never-delete. Cost estimate from
  discovery: roughly $0.50 to $1 a month per heavy tier 3 recorder at peak.
- **Tier 1 call limits:** 60 minutes of video and 240 minutes of voice a month,
  counting only calls the parent places; receiving calls is always free. Minutes
  reset monthly on the billing date and do not carry over; a parent at the
  limit is offered an upgrade (**Assumption** for the reset and counting).
  Tiers 2 and 3 are unlimited.
- Canada is one-party consent (Criminal Code s. 184), but both parents still
  consent to every recording, for neutrality and admissibility.

### Agreements

- A parent enters agreement terms as structured fields and attaches the signed
  agreement (PDF or photo) for reference.
- The other parent reviews and accepts or disputes. **Nothing is enforced until
  both parents have accepted.**
- Changes go through the same propose-and-accept flow. Every version is kept.
- If terms are disputed, never accepted, or the other parent never joins, there
  is nothing to enforce and the calendar works as a plain shared calendar.
  Resolving disputes is outside the app.
- v1 terms cover the calendar only: the regular schedule and each parent's
  annual vacation allowance. Expense split percentages and recurring support
  are also agreed in-app (see Expenses).

### Calendar and enforcement

- Regular schedule from common repeating patterns (week on/week off, 2-2-3,
  2-2-5-5, alternating weekends) or a custom repeating cycle, plus handoff time.
- One time zone per family.
- **Vacation allowance:** counted in **overnights** per parent, resetting every
  **calendar year** (January 1).
- A booking within the allowance is added to the calendar, notifies the other
  parent, and reduces the allowance.
- A booking that exceeds the allowance becomes a **request**. The other parent
  approves (added to the calendar) or denies (recorded, not added).
- Swaps and trades are always requests and never use allowance.
- General events (appointments, school events) can be added freely by either
  parent; informational only, never counted or enforced.
- Bookings can cover all children or specific children.
- Holidays are booked manually in v1; rotating holiday rules are later.

### Expenses and payments

- A parent logs an expense: amount, category, date, description, and a
  **required receipt** (photo or PDF).
- The split defaults to the accepted agreement percentage and can be adjusted
  per expense.
- The other parent approves or rejects with an optional reason.
- **Approval automatically triggers a pre-authorized debit** of the approving
  parent's share, paid to the logging parent.
- If the paying parent has no debit mandate, the expense is marked approved but
  unpaid and they are prompted to set one up.
- Either parent can record an expense as paid outside Tango (cash,
  e-Transfer).
- Payment status is always visible: pending, paid, failed, disputed. Failed
  debits notify both parents.
- **Recurring child support:** amount, frequency, and start date, accepted by
  both parents; the payer signs the debit mandate and payments run
  automatically. Changes need both parents again, plus a new mandate when the
  bank terms require it.
- Payments use Stripe Connect: the receiving parent completes Stripe identity
  and bank verification; the paying parent signs a Canadian pre-authorized
  debit (ACSS) mandate. PAD settles over several business days, can fail for
  insufficient funds, and can be disputed for 90 days or more.

### Court-ready export

- PDF export of conversations (with attachments and message status),
  the access log, the call log and recording references, calendar requests and
  decisions, agreement versions, and expenses and payments, for a chosen date
  range, in English or French.
- **Digital seal (v1):** every export is signed with Tango's Adobe-trusted
  (AATL) Organization Validated document signing certificate from SSL.com.
  Opening the PDF in Adobe Acrobat Reader shows a valid signature with a green
  checkmark, and any change to the file breaks it. This replaces the earlier
  plan for verification codes and a public verification page.
  - The private key is generated in and never leaves Azure Key Vault (Premium
    or Managed HSM, FIPS 140-2 Level 2 or higher). A Supabase Edge Function
    sends only the SHA-256 hash of the PDF's signed byte range to Key Vault,
    authenticating with a service principal stored in Supabase secrets.
  - Each signature carries the certificate chain, a trusted timestamp
    (SSL.com's timestamp service), and revocation data, so it stays valid
    after the certificate expires or renews.
  - Every export gets a unique export ID, and Tango stores who generated it,
    when, the date range and language, the latest message hash at that moment,
    and a SHA-256 fingerprint of the final signed PDF. This record is
    append-only.
  - Because records never change, a fresh export of the same range reproduces
    the same messages, which is the fallback check for a disputed copy.
- Every export is recorded in the access log.
- Available to lapsed parents and to invited professionals.

### Court admissibility (research notes)

Not legal advice; the pre-launch lawyer review confirms this.

- In Canada, electronic records are governed by the Canada Evidence Act
  ss. 30 and 31.1 to 31.8 and the provincial evidence acts. The party relying
  on a record must prove it is what it claims to be (s. 31.1), and a printout
  satisfies the best evidence rule when the integrity of the system that stored
  it is shown (s. 31.2), which is presumed absent contrary evidence (s. 31.3).
  Compliance with recognised standards supports integrity (s. 31.5).
- The recognised standard is **CAN/CGSB-72.34-2024, Electronic records as
  documentary evidence**. It is mostly about documented records policies and
  controls (security, audit trails, retention, change control).
- What Tango does for this: authenticated senders, server timestamps,
  append-only storage, the access log, the hash chain, digitally sealed exports,
  and a written records-management policy (a pre-launch document, not a
  feature).
- **Records-custodian affidavit:** like OFW's business records affidavit,
  Tango offers a sworn statement from a named records custodian supporting the
  authenticity and integrity of a family's record. This is an operational
  process (custodian, template), shaped by the lawyer review. Certified
  records are **unlimited on tiers 2 and 3 and not included on tier 1**, as on
  OFW. **TODO:** turnaround, and whether tier 1 can buy one.

### Professional portal

**Moved into v1 in this revision** (previously deferred), following the OFW
model.

- **Free** professional accounts for lawyers, mediators, and other family-law
  professionals. Anyone can sign up as a professional; there are no
  professional types and **no credential check** in v1.
- A professional sees nothing until a **parent invites them** to a specific
  family by name and email, and they accept.
- Access is read-only and limited to the areas the inviting parent chooses
  (for example messages only, or messages and expenses).
- The other parent is notified and always sees which professionals have access.
- Every professional action is recorded in the access log.
- The inviting parent can revoke access at any time.
- Professionals can generate exports and download any export either parent
  generated, within the areas they were granted. **Assumption** for the area
  limit.
- Professionals can play back and export call recordings in granted areas.

### Notifications

- Email notifications on web (new messages, requests, approvals, calls, payment
  events), never including message text. Push notifications on mobile.

### Deferred (not v1)

- **United States launch.** Would need US bank debit (ACH), USD, US state
  privacy laws (such as California's CCPA/CPRA), state call-recording consent
  rules (about a dozen all-party states), US evidence certifications (FRE
  902(11), 902(13), 902(14)), and new positioning.
- **Fee-waiver proof** (version 2, only if the honour system is abused).
- Family helpers (calendar only), invited by a parent.
- Credential checks for professionals.
- Customizable roles and permissions.
- Agreement enforcement beyond the calendar (expenses, travel notice, support
  changes).
- Rotating holiday schedules; anniversary-based allowance resets.
- Two-factor authentication.
- Smarter search.
- Transaction fees on payments.
- Other international markets; Spanish.

## 4. Data - What are we storing?

Everything belongs to a family except the user's own profile, subscription,
fee waiver, and professional account.

- **Users/profiles:** identity, name, language preference, subscription tier
  and status.
- **Professional accounts:** profile (name lives there); per-family access
  grants with the granted areas, inviting parent, and revocation.
- **Families:** members (exactly two parents in v1), time zone, and per
  parent whether they have deleted (hidden) the family and when.
- **Children:** name, birthdate.
- **Conversations:** subject, started by, started at; append-only.
- **Messages:** append-only; conversation, sender, server timestamp, body,
  attachments, hash chain link, message status (sent, delivered, received, previewed, read, replied).
- **Attachments:** message, file name, type, size, storage location; append-only.
  Each parent's likes and archives are separate, changeable records.
- **Access log:** append-only events: sign-ins, message views, replies,
  exports, professional actions, and call events.
- **Calls:** call log (caller, callee, start, end, answered, in-call events),
  recording consent from both parents, and recordings (append-only).
- **Exports:** export ID, generated by, generated at, range, language, latest
  message hash, fingerprint of the signed PDF.
- **Agreements:** append-only versions with structured terms (schedule pattern,
  vacation allowance, expense split), attached documents, and each parent's
  acceptance or dispute.
- **Calendar:** schedule pattern, bookings, events, requests and decisions,
  allowance usage per parent per year.
- **Expenses:** amount, category, receipt, split, approval decision, payment
  status.
- **Payments:** Stripe connected accounts, mandates, payment intents, recurring
  support schedules, webhook-driven status history.
- **Subscriptions:** per parent, tier, monthly or annual, status, period.
- **Fee waivers:** request, optional reason and note, decision, decided by,
  start and end dates.
- **Activity history:** an append-only log of significant actions.

Records are never hard-deleted, with one exception: call recording and
transcript files are deleted 3 years after the call (the call record stays).
Account closure and legal retention rules are a **TODO** for the privacy review.

## 5. Tech - What stack are we using?

- **Monorepo:** `apps/web`, `apps/mobile`, `supabase/`, and `packages/shared`
  (types, validation, data access, business rules such as allowance math and
  expense splits, and translations), using npm workspaces.
- **Web:** Next.js, TypeScript, Tailwind CSS, and the Tailwind Plus Catalyst
  UI kit for every UI element.
- **Mobile:** Expo SDK 57, React Native, Expo Router, TypeScript. **TODO:**
  styling library (NativeWind likely, so Tailwind settings carry over).
- **Backend:** Supabase (Postgres, Auth, Storage) in `ca-central-1`. Access
  control enforced with row-level security, scoped to family membership and
  professional access grants.
- **Calls:** Agora real-time voice and video, plus Agora cloud recording.
  Published recording rates: about $1.49 per 1,000 minutes for audio and $5.99
  per 1,000 minutes for HD video, plus Agora's per-minute call charges.
  **TODO:** where recordings are stored (Supabase Storage or object storage in
  Canada).
- **AI tone meter:** **TODO:** provider and model.
- **Payments:** Stripe Connect with ACSS pre-authorized debit; Stripe Billing
  for tiered subscriptions in CAD; Stripe Tax for GST/HST/QST on subscriptions
  (**Assumption**); webhooks handled by the Next.js server.
- **Email:** transactional provider (Resend or Postmark), also used by Supabase
  Auth.
- **Export signing:** Supabase Edge Function (Deno, TypeScript) signing with
  an RSA key in Azure Key Vault (Premium or Managed HSM) and an SSL.com OV
  AATL document signing certificate (about US$299 a year; no per-signature
  fees, since Tango signs with its own key rather than eSigner). TalkingParents
  also signs every PDF record.
- **Scheduled jobs:** recurring support debits, allowance resets, payment status
  checks, fee waiver expiry (Supabase cron or Vercel cron).

## 6. Monetize - How will this make money?

- **Three tiers, per parent, priced about 20% below OFW:**

  | Tier | Monthly | Annual |
  |---|---|---|
  | Tier 1 | $11.99 | $119.99 |
  | Tier 2 | $17.99 | about $179.99 |
  | Tier 3 (top) | $24.99 | about $249.99 |

  Annual plans are about 17% below twelve monthly payments, matching tier 1.
  For comparison, OFW's Canadian 1-year plans are $149.99 (Essentials),
  $216.00 (Premium), and $299.88 (Max), from a third-party 2026 guide; confirm
  before launch. Only tier 1's annual price is a full 20% below OFW.
- **What each tier includes** (modelled on OFW Essentials, Premium, and Max):

  | | Tier 1 | Tier 2 | Tier 3 |
  |---|---|---|---|
  | Messaging, tone meter, calendar, agreements, expenses | Yes | Yes | Yes |
  | Payments (expenses and child support) | Unlimited | Unlimited | Unlimited |
  | Signed PDF exports | Unlimited | Unlimited | Unlimited |
  | Calls placed per month | 60 min video, 240 min voice | Unlimited | Unlimited |
  | Document storage | 1 GB | Unlimited | Unlimited |
  | Certified records (affidavits) | Not included | Unlimited | Unlimited |
  | Call recording and transcription, kept 3 years | No | No | Yes |

  Document storage counts message attachments and agreement documents the
  parent uploads. **Expense receipts never count toward it.** At the cap a
  tier 1 parent can still read and send text but cannot upload new documents
  until they upgrade; nothing stored is removed (**Assumption** for at-cap
  behaviour).
- One subscription covers any number of families. **No free trial.**
- The card is collected during onboarding; **a parent is not charged until the
  co-parent has joined**.
- **Fee waivers (honour system):** a parent requests free access in the app,
  with an optional reason (social assistance, legal aid, financial hardship,
  safety) and note, and no proof. The owner gets an email and approves or
  denies; each decision is logged. A waiver lasts one year and is renewed by
  asking again. Waived parents get tier 1 plus unlimited calling (as OFW
  does). **Assumption** for the email, duration, and what waived parents get.
  **TODO:** approve from a minimal owner-only page or in Supabase Studio.
- **Lapsed parents** can read everything, export the court PDF, approve or deny
  the other parent's requests and expenses, play back recordings, and their
  pre-authorized debits keep running. They cannot send messages, place calls,
  create bookings or requests, or enter expenses; trying prompts them to renew.
  **A lapse never hurts the other parent.**
- Professionals are always free.
- Transaction fees on payments later.
- **TODO:** whether subscriptions are sold through Apple and Google in-app
  purchase or on the web (under research).

## 7. UI/UX - How should this look and feel?

- Design is owned by the project owner. Every UI element comes from the
  Tailwind Plus **Catalyst UI kit** (`design/references/tailwind-plus/catalyst-ui-kit/`);
  other Tailwind Plus references are used only where Catalyst has no fitting
  component. Colours, logo, and branding are set manually.
- A public landing page at `/` for signed-out visitors, aimed at parents going
  through a high-conflict separation; signed-in visitors go to the dashboard.
  The logo always links home.
- Screenshots for reference live in `design/references/` (reference only, never
  shipped).
- **TODO:** tone, light/dark mode, mobile component library.
- Accessibility follows the coding standards on both platforms.

## 8. Deployment - Where and how will this ship?

- **Web:** Vercel, server functions pinned to the closest Canadian or US-East
  region (verify during `/release`).
- **Backend:** Supabase, `ca-central-1`; separate staging and production
  projects; Supabase CLI for local development.
- **Stripe:** test mode in staging, live mode in production.
- **Mobile:** EAS Build and Submit to the App Store and Google Play.
- **Env vars (by name, values TBD):** Supabase URL and keys, Stripe secret and
  publishable keys, Stripe webhook secret, email provider API key, Agora app ID
  and certificate, AI provider API key, Azure service principal (tenant ID,
  client ID, client secret) and Key Vault URL and key name.
- Nothing is set up yet: Vercel, Supabase staging and production, Stripe,
  email provider, Agora, AI provider, Azure Key Vault, the SSL.com
  certificate (including organization vetting), domain, and Apple and Google
  developer accounts all need creating.
- **TODO:** verify a sending domain in Resend and set the `INVITE_FROM_EMAIL`
  Edge Function secret to an address on it, in staging and production. Until
  then staging can only send from `onboarding@resend.dev`, which Resend delivers
  only to the Resend account's own email.

### Pre-launch requirements (not features)

- Quebec Law 25 privacy impact assessment covering every processor that handles
  data outside Quebec (Stripe, email, push, Agora, the AI provider, Supabase
  subprocessors).
- Privacy policy and terms of service, including call-recording notice and
  consent.
- A written records-management policy aligned with CAN/CGSB-72.34-2024.
- A named records custodian and an affidavit template.
- Review by a Canadian privacy lawyer and a family-law lawyer, including what
  makes the message and call record admissible.

## 9. Usage model and constraints

- Internet-facing, Canada-wide, bilingual. **Canada only in v1.**
- **Users may be adversarial toward each other.** Each parent must be unable to
  read another family's data, alter shared history, or act on the other
  parent's behalf. Professionals see only the families and areas they were
  granted. Enforced in the database, not only in the UI.
- Single product, many independent families.
- Financial data and payments are in scope; card and bank details stay with
  Stripe.
- **Non-requirements for v1:** two-factor authentication, international
  markets (including the US), credential checks for professionals.
- **TODO:** expected launch scale, success criteria.
