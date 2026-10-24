# Build Plan

Features in rough build order. Keep each item to one line; details come later
in `/feature`. When both planning docs are ready, run `/overview`.

Run `/feature` to spec the next unchecked item, or `/feature 2` to pick one.
Keep completed items checked and append new features as the project grows.
Do not renumber completed features; their archived specs refer to those IDs.

## Your features

### Foundation

- [x] 1. **Monorepo structure** - move the Expo app to `apps/mobile`, add a Next.js `apps/web`, shared packages, and update `AGENTS.md`, coding standards, and commands
- [x] 2. **Supabase foundation** - local Supabase, staging project in `ca-central-1`, base schema for profiles, families, and family membership with row-level security
- [x] 3. **Web authentication** - sign up, sign in, sign out, and profile on web via Supabase Auth
  - [x] 3a. **Email and password authentication** - sign up with email confirmation, sign in, sign out, forgot password, and profile
  - [x] 3b. **Google sign-in** - sign up and sign in with Google, linked to the same profile
- [x] 4. **Bilingual foundation** - shared English and French translations with a language preference, wired into web
- [x] 24. **Landing page and dashboard** - public home page for signed-out visitors (logo top left, log in top right, headline for parents in a high-conflict separation, get started), and a dashboard shell where signed-in parents land

### Onboarding

- [x] 31. **Onboarding flow** - choose family or practitioner, then a step-by-step flow into the existing sign-up; practitioners land on a placeholder home until the portal exists
  - [x] 31a. **Account type choice** - "What best describes you?" screen after Get started; parents continue to pricing, professionals to sign-up, and the account type is saved on the profile
  - [x] 31b. **Professional home** - a professional account record and a placeholder home for professionals until the portal exists
- [ ] 16. **Tiered subscriptions** - tier selection screen in onboarding, Stripe Billing in CAD, card collected at sign-up, charging from when the co-parent joins, and lapsed-parent restrictions
  - [x] 16a. **Pricing page** - Basic, Standard, and Premium tiers with a monthly or annual switch on /pricing; choosing one continues to parent sign-up
  - [ ] 16b. **Payment method** - Stripe Billing in CAD, card collected after sign-up
  - [ ] 16c. **Subscription charging** - first charge when the co-parent joins, and lapsed-parent restrictions
- [ ] 5. **Family pairing** - final onboarding step: invite the co-parent by email (or accept an invite), create the family on acceptance, block duplicate pairings, and add children
  - [x] 5a. **Co-parent invites** - invite the co-parent by email or accept an invite, create the family on acceptance, and block duplicate pairings
  - [ ] 5b. **Children** - add children to the family
  - [ ] 5c. **Co-parent switching and settings** - with two or more co-parents, the header menu shows the selected co-parent and switches between them; a Co-parents section in Settings deletes (hides) a co-parent after typing their name and restores deleted ones

### Messaging

- [ ] 6. **Subject conversations** - permanent conversations titled by the parent who starts them, in one scrollable list, with server timestamps, attachments (counted toward tier 1's 1 GB document storage), and no editing or deleting
  - [x] 6a. **Messages layout** - Messages in the parent sidebar opens a multi-column page: a narrow list of conversations beside the chat, with placeholder conversations until 6b
  - [x] 6b. **Conversations and messages** - append-only conversations and messages: start a titled conversation, send with server timestamps, real data in the layout with live updates, and message status (sent, delivered, received, previewed, read, replied) recorded and shown to both parents
  - [ ] 6c. **Attachments** - photo, video, PDF, and Office attachments (10 files of 50 MB each per message, text optional) that open or download when clicked, with sizes recorded for tier 1's 1 GB document storage
- [ ] 7. **Access log and tamper evidence** - an append-only log of sign-ins, views, and replies, and a hash chain over messages
- [ ] 8. **Message search** - English and French keyword search across subjects and messages with date, sender, and attachment filters
- [ ] 25. **AI tone meter** - warn about hostile wording while a parent writes and suggest a calmer rewrite, never blocking a message
- [ ] 33. **Photos and files** - Photos and Files links in the parent sidebar listing every attachment shared with a co-parent, newest first, opening in the same viewer as conversations
- [ ] 34. **Liked and archived files** - each parent can like and unlike, and archive and unarchive, photos and files, with Liked and Archived folders; organizing never modifies or deletes a file

### Agreements and calendar

- [ ] 9. **Shared calendar** - regular schedule patterns, custom cycles, handoff times, and general events
- [ ] 10. **Agreements** - enter calendar terms and allowance, attach the signed document, mutual acceptance, and versions
- [ ] 11. **Calendar enforcement** - overnight allowance tracking, bookings, and approve-or-deny requests and swaps

### Expenses and payments

- [ ] 12. **Expenses** - log with receipt, agreement split, approve or reject, and record settled outside Tango
- [ ] 13. **Stripe onboarding** - Connect accounts for receiving parents and pre-authorized debit mandates for payers
- [ ] 14. **Expense payments** - approval triggers a debit, with webhook-driven pending, paid, failed, and disputed status
- [ ] 15. **Recurring child support** - mutually accepted schedule with automatic recurring debits

### Subscriptions

- [ ] 29. **Fee waivers** - honour-system request for free access (linked from the onboarding tier step), approved or denied by the owner, lasting one year

### Calls

- [ ] 26. **Voice and video calls** - in-app calls between co-parents through Agora, every call logged, and tier 1's monthly limit of 60 video and 240 voice minutes placed
- [ ] 27. **Call recording** - top-tier callers choose to record, both parents consent before the call connects, recordings are transcribed, both parents can play back, and files are kept 3 years

### Exports, professionals, and notifications

- [ ] 32. **Signed exports** - an Adobe-trusted (AATL) organization seal applied by a Supabase Edge Function, with the private key held in Azure Key Vault and never leaving it
  - [ ] 32a. **Signing key and certificate** - setup guide and check script: RSA key created in Azure Key Vault (Premium or Managed HSM) with its key attestation, SSL.com OV document signing certificate, and the issued chain imported back into the vault
  - [ ] 32b. **Signing function** - Edge Function that hashes a PDF's byte range, signs the hash with Key Vault using a service principal from Supabase secrets, and embeds the signature, certificate chain, trusted timestamp, and revocation data so Acrobat Reader shows a valid seal
- [ ] 17. **Court-ready export** - bilingual PDF of conversations, the access log, calls, requests, agreements, and payments, sealed by feature 32 and delivered to web and mobile
- [ ] 28. **Professional portal** - free accounts for lawyers and mediators, access only by a parent's invitation, read-only areas, exports, and full logging
- [ ] 18. **Email notifications** - messages, requests, approvals, calls, and payment events, without message text

### Mobile

- [ ] 19. **Mobile foundation** - auth, shared packages, translations, and styling on the Expo app
- [ ] 20. **Mobile messaging, calls, and push** - conversations, search, tone meter, calls, and push notifications
- [ ] 21. **Mobile calendar and requests** - schedule, bookings, and request approvals
- [ ] 22. **Mobile expenses and payments** - expenses, approvals, and payment status
- [ ] 23. **Mobile subscription, export, and release** - subscription flow, PDF export, and EAS store submission
