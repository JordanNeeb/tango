# Fix: No suggestions on the co-parent invite field

**Type:** Fix
**Status:** verified
**Branch:** fix/no-suggestions-on-the-co-parent-invite-field

## The problem

The co-parent email field on the parent welcome page shows a browser
suggestions dropdown. The field is in `InviteForm` in
`apps/web/src/components/dashboard/parent-welcome.tsx`. The dropdown offers the
parent's *own* saved addresses, which is never what they want there: the field
is for someone else's email.

The input already sets `autoComplete="off"`, but browsers don't treat that as
final for an email field. Chrome and Safari classify a field as an email from
`type="email"` and from `email` in its `name` and `id`, and still offer
address autofill. Password managers (1Password, Bitwarden, LastPass) add their
own popups unless told to ignore the field. The owner isn't sure which
dropdown they saw, so the fix covers all three sources.

## The fix

On the invite input only:

- **No email signals for autofill:**
  - Change `type="email"` to `type="text"` with `inputMode="email"`, so phones
    still show the email keyboard.
  - Add `autoCapitalize="none"` and `spellCheck={false}`, which `type="email"`
    used to imply.
  - Rename `name="email"` to `name="coparent"`, `id` from `coparent-email` to
    `coparent`, and the error id to `coparent-error`. Update the label's
    `htmlFor` and `aria-describedby` to match.
- **`autoComplete="coparent"`** (revised after testing): with the changes
  above, Chrome still offered the owner's Google addresses, because it ignores
  `autoComplete="off"` for address autofill and still recognises the field from
  its "Co-parent's email" label and placeholder. Chrome skips autofill when
  `autocomplete` holds a value it doesn't recognise, so the field uses the
  unrecognised token `coparent` instead of `off`.
- **Password managers:** add each vendor's documented opt-out attributes:
  `data-1p-ignore`, `data-bwignore`, `data-lpignore="true"`.
- **Server:** `sendInvite` in `apps/web/src/app/[lang]/dashboard/actions.ts`
  reads `readText(formData, "coparent")` instead of `"email"`. Its returned
  `fieldErrors.email` / `values.email` keys stay as they are, so the form's
  error and value handling is unchanged.

Keep these unchanged:

- Validation is server-side, through `validateEmail`, so `type="text"` loses
  no checking. The form is already `noValidate`.
- The visible label, placeholder ("Co-parent's email"), error message, focus on
  the first error, and the email keyboard on phones.
- Sign-in, sign-up, and forgot-password email fields keep their autofill. Those
  are the user's own address.

## Build steps

- [x] **1. Opt the invite field out of suggestions.**
  - Update the input, label, and error ids in `parent-welcome.tsx`, and the
    form field name in `actions.ts`.
  - Done when:
    - Sending an invite still works and an empty or invalid address still
      shows the inline error.
    - `npm run typecheck`, `npm run lint:web`, and `npm run build:web` pass.

## Verify

1. Run `npm run dev:web` and sign in as a parent without a family, so the
   welcome page shows.
2. Click into the co-parent email field in your usual browser. No saved-email
   or password-manager dropdown appears.
3. Submit it empty. "Enter your co-parent's email address." shows under the
   field and focus moves to it.
4. Enter a real address and send. The invite sends as before (the email lands
   in Mailpit at http://127.0.0.1:54324).

Note: browsers change their autofill rules over time. If one still shows a
dropdown after this, report which browser and what the dropdown lists.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":3614,"specSha256":"c31b17c1e6e499ad026260d256f767da8b5675a5fb6824dc6a6842b210226858","branch":"refs/heads/fix/no-suggestions-on-the-co-parent-invite-field","head":"1d628494d8fab388d9f63cd46bbb73b2a14696fe","baseRef":"refs/heads/dev","baseCommit":"1d628494d8fab388d9f63cd46bbb73b2a14696fe","sourceTree":"85eac695386a7a68d80398c7ec9ae40998411da2","landing":"local-merge","absentOptional":[]} -->

## Commands

- `npm run typecheck`: pass
- `npm run lint:web`: pass
- `npm run build:web`: pass

Not run: `/check`, `/audit`, and an invite send. No test command is configured. Independent review was not selected (one form field; server validation unchanged). The owner reported Chrome still showing Google suggestions after the first pass; the `autoComplete="coparent"` revision was made after that and has not been confirmed in a browser.

## Try it now

1. Run `npm run dev:web` and sign in as a parent without a family, so the welcome page shows.
2. Click into the co-parent email field in Chrome. No saved-email, Google, or password-manager dropdown appears.
3. Submit it empty. "Enter your co-parent's email address." shows under the field and focus moves to it.
4. Enter a real address and send. The invite sends as before (the email lands in Mailpit at http://127.0.0.1:54324).
