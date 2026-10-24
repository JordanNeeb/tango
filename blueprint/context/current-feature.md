# Feature: Attachments

**From build-plan:** feature 6c
**Build attempt:** 1
**Branch:** feature/attachments
**Status:** approved

## Goal

Parents can attach photos, videos, PDFs, and Office documents to a message, and
open any attachment by clicking it in the conversation. Files are permanent like
the messages they belong to, and each file's size is recorded so tier 1's 1 GB
document storage can be enforced once subscriptions exist (16c).

## In scope

- **Attaching.** A paperclip button in the composer, used by both an open
  conversation and the new message screen, picks up to **10 files per message**,
  each up to **50 MB**. The picked files show as removable chips (name and size)
  above the text box. A message needs text, attachments, or both. Subject rules
  are unchanged.
- **Allowed types** (MIME type, checked in the browser and again on the server):
  - photos: `image/jpeg`, `image/png`, `image/webp`, `image/gif`,
    `image/heic`, `image/heif`
  - videos: `video/mp4`, `video/quicktime`, `video/webm`
  - PDF: `application/pdf`
  - Office: `.doc` `application/msword`, `.docx`
    `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
    `.xls` `application/vnd.ms-excel`, `.xlsx`
    `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`,
    `.ppt` `application/vnd.ms-powerpoint`, `.pptx`
    `application/vnd.openxmlformats-officedocument.presentationml.presentation`
  - SVG, HTML, and anything else is rejected.
- **Showing.** Each message renders its attachments under the text, in upload
  order:
  - photos (except HEIC/HEIF) appear as thumbnails
  - videos appear as tiles with a play icon
  - PDFs, Office files, and HEIC/HEIF appear as file tiles with an icon, the
    file name, and the size
- **Opening when clicked:**
  - photo: a full-screen viewer dialog shows the image, with its file name, a
    Download link, a Close button, and Escape to close
  - video: the same viewer with a native `<video controls>` player, plus
    Download
  - PDF: opens in a new tab in the browser's own PDF viewer
  - Office documents and HEIC/HEIF photos download, because browsers can't
    display them. The tile says "Download".
- **States:**
  - **Uploading:** after Send, the message shows as Sending with its file
    names, and the composer stays locked until the upload and send finish.
  - **Invalid pick:** a wrong type, a file over 50 MB, or more than 10 files is
    refused before upload, with an inline error under the composer that says
    which file and why.
  - **Failed upload or send:** a form error appears, the text and picked files
    stay in the composer to retry, and nothing is sent.
  - **File that can't load:** a thumbnail or video that fails to load shows the
    file tile instead.
- **Conversation list:** an attachment-only latest message previews as
  "Attachment" (French: "Pièce jointe").
- **Storage usage:** every attachment row stores its byte size, read from the
  stored file, never from the browser. A parent's usage is the sum over the
  messages they sent. Nothing blocks uploads yet.
- Both languages, light and dark mode, keyboard access, and screen-reader labels
  for every new control.

## Out of scope

- Enforcing the 1 GB cap and showing usage (16c, once tiers exist).
- An Attachments, Photos, or Files page, a contact page listing everything shared
  between two parents, and liking or archiving files (plan items 33 and 34).
- Showing Office documents inside the app, converting HEIC, video thumbnails, and
  image resizing.
- Searching by attachment (8), attachments in exports (17), hash-chain coverage
  (7), and mobile (20).
- Cleaning up files that were uploaded but never sent.

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review packet.
Checkpoint commits are disabled. `npm test` must pass for every step that adds
logic, and `npm run typecheck`, `npm run lint:web`, and `npm run build:web` must
pass before review. Migrations are pushed to staging only with an explicit yes
each time. `/complete` makes the feature commit.

## Build steps

- [x] **1. Attachment rules in shared logic.** Add
  `apps/web/src/lib/attachments.ts` with the allowed MIME list, `MAX_FILES = 10`,
  `MAX_BYTES = 50 * 1024 * 1024`, and these helpers:
  - `attachmentKind(mime)`: `image | video | pdf | download`, where HEIC/HEIF
    and Office count as `download`
  - `validatePicked(files)`: the first error per file, typed so the UI can name
    the file
  - `formatBytes(n, language)`
  - `parseAttachmentPaths(formData)`: returns a list of storage paths of the
    form `<family uuid>/<uuid>`, rejects anything else, and allows at most 10

  Add the EN/FR strings to `packages/shared/src/i18n`.
  **Done when** `attachments.test.ts` covers each kind, the type, size, and count
  limits at their exact boundaries, a malformed or traversal path
  (`../x`, `a/b/c`), and both byte formats, and `npm test` passes.

- [ ] **2. Database and storage migration.** Create it with
  `npx supabase@latest migration new attachments`. Contents:
  - **Bucket.** A private `attachments` bucket with
    `file_size_limit = 52428800` and the allowed MIME list.
  - **Storage RLS on `storage.objects` for that bucket:**
    - insert: allowed when the first path segment is a family the caller
      belongs to
    - select: same rule
    - update and delete: no policy, so files can never be changed or removed
  - **`public.message_attachments`** (append-only, with the existing
    `private.reject_append_only_change` trigger):
    - `id uuid pk default gen_random_uuid()`
    - `message_id uuid not null references messages`
    - `storage_path text not null unique`
    - `file_name text not null`, 1–255 characters
    - `mime_type text not null`
    - `size_bytes bigint not null check (size_bytes > 0)`
    - `position smallint not null`, 0–9, unique per message
    - `created_at timestamptz not null default now()`

    Members of the message's family get `select` through RLS. Revoke
    everything else.
  - **Messages check.** Relax the messages body check to
    `body = '' or private.has_visible_text(body)`.
  - **RPCs.** Replace `start_conversation` and `send_message` with versions
    that take `attachments jsonb default '[]'`, an array of
    `{path, name}`. Drop the old signatures and re-grant to `authenticated`
    only. In the same transaction they:
    - require visible text or at least one attachment (`invalid_body`)
    - allow at most 10 attachments (`invalid_attachments`)
    - check each path against `storage.objects` in the `attachments` bucket:
      the caller owns it, its first segment is the target family, its stored
      `metadata->>'mimetype'` is allowed, and its size is at most 50 MB.
      Otherwise raise `invalid_attachments`.
    - reject a path already attached (`invalid_attachments`)
    - insert the attachment rows with the size and MIME type taken from
      `storage.objects`
  - **Previews.** Extend `conversation_previews` with
    `latest_attachment_count`.
  - Regenerate `packages/shared/src/database.types.ts`.

  **Done when:**
  - `db reset` (or the staging push, after approval) applies cleanly and
    `npx supabase@latest db lint` reports nothing new
  - SQL checks show a non-member can't insert or read an object, an
    `update` or `delete` on an attachment row raises `append_only`, and a
    forged path, someone else's object, or another family's object raises
    `invalid_attachments`
  - `npm run typecheck` passes

- [x] **3. Server actions and data loading.**
  - **Actions.** `startConversation` and `sendMessage` read attachments with
    `parseAttachmentPaths` plus their names. They accept an empty body when
    attachments exist, pass `attachments` to the RPCs, and map
    `invalid_attachments` to a form error.
  - **`loadConversation`.** Also loads each message's attachments in position
    order and signs their URLs in one `createSignedUrls` call that expires
    after 1 hour. Downloads are signed with the original file name.
  - **Types.** `ConversationMessage` gains
    `attachments: { id, name, mimeType, sizeBytes, kind, url, downloadUrl }[]`.
  - **`loadConversations`.** Maps `latest_attachment_count` so an empty
    latest body can preview as "Attachment".

  **Done when** the action and loader tests cover:
  - an attachment-only send
  - a rejected path
  - the `invalid_attachments` mapping
  - attachments in order with signed URLs
  - a signing failure returning `"error"`
  - the preview label

  `npm test` passes.

- [ ] **4. Picking and uploading in the composer.** Add a paperclip button and
  a hidden `<input type="file" multiple accept=…>` outside the form's submitted
  fields, plus the chip list and its remove buttons, to the shared composer
  (`composer-field.tsx`, `chat-panel.tsx` `Composer`,
  `new-conversation-form.tsx`). On submit, the browser:
  1. validates the picked files
  2. uploads each one with the browser Supabase client to
     `<familyId>/<crypto.randomUUID()>`, with `upsert: false` and its
     `contentType`
  3. submits the paths and names as hidden fields

  The optimistic Sending bubble lists the file names. Send is enabled when there
  is text or a picked file.
  **Done when**, against staging after the migration is approved:
  - a photo, a PDF, and an attachment-only message each send and appear for
    both parents with live updates
  - an invalid pick shows its inline error without uploading
  - a failed upload keeps the text and the files
  - the screenshots and console are clean
  - `npm run build:web` passes

- [ ] **5. Showing and opening attachments.**
  - **Tiles.** Render photo thumbnails, video tiles, and file tiles in
    `MessageBubble` (new `attachment-list.tsx`).
  - **Viewer.** Add an `attachment-viewer.tsx` dialog for photos and videos,
    copied from the Catalyst dialog in `design/references/` and built on the
    installed Headless UI. It has the file name as its title, Download, Close,
    Escape, and focus returns to the tile.
  - **Opening.** PDFs open in a new tab with `rel="noopener noreferrer"`.
    Downloads use the signed download URL.
  - **Broken files.** A thumbnail that fails to load falls back to the file
    tile.
  - **List preview.** The conversation list shows the "Attachment" preview.

  **Done when** browser checks in both languages and both themes show:
  - clicking a photo opens and closes the viewer by mouse and keyboard
  - a video plays
  - a PDF opens in a new tab
  - a `.docx` and a HEIC file download with their original names
  - a screen reader announces each tile's name and action
  - `npm run lint:web` and `npm run build:web` pass

## Files / areas

- `supabase/migrations/<timestamp>_attachments.sql` (new)
- `packages/shared/src/database.types.ts`, `packages/shared/src/i18n/en.ts`, and
  `fr.ts`
- `apps/web/src/lib/attachments.ts` and its test (new)
- `apps/web/src/lib/messages-data.ts` and its test
- `apps/web/src/app/[lang]/(app)/messages/actions.ts` and its test
- `apps/web/src/components/conversations/`:
  - `types.ts`
  - `chat-panel.tsx`
  - `composer-field.tsx`
  - `new-conversation-form.tsx`
  - `conversation-list.tsx`
  - `attachment-list.tsx` (new)
  - `attachment-viewer.tsx` (new)
- `apps/web/src/lib/supabase/client.ts`, used as is for uploads

## Data / contracts

- **Storage path:** `<family_id>/<uuid v4>` in the private `attachments`
  bucket.
  - The browser generates the uuid. The path never contains the file name.
  - The server trusts only `storage.objects`: owner, bucket, path, the size in
    `metadata->>'size'`, and the type in `metadata->>'mimetype'`.
- **RPC input:** `attachments jsonb`, an array of up to 10
  `{ "path": text, "name": text }` items.
  - `name` is the original file name, trimmed, 1–255 characters, stored and
    shown as plain text.
  - Positions follow array order.
- **RPC errors** (raised as the message, `P0001`):
  - existing: `invalid_subject`, `invalid_body`, `not_member`
  - new: `invalid_attachments`, which maps to the form error "These files
    couldn't be attached. Try again."
- **Signed URLs:** 1-hour expiry. A conversation left open past an hour gets new
  ones from the next live refresh or a reload.
- **Trust boundary:**
  - Uploading never makes a file visible. Only an RPC run as the caller links it
    to a message in a family they belong to.
  - Uploaded files that are never sent stay unreachable to the co-parent, and
    their size isn't counted.

## Testing

- Unit tests (Vitest, `npm test`):
  - `lib/attachments.test.ts`
  - updates to `messages/actions.test.ts`, `messages-data.test.ts`, and the
    shared i18n parity test, which covers the new strings automatically
- SQL checks for the storage policies, append-only rows, and RPC rejections, run
  against the local or staging database (step 2).
- Manual browser checks against staging with two paired accounts (steps 4–5).
  There is no browser test harness, so none is added.

## Notes for the AI

- Uploads go from the browser straight to Supabase Storage. Never send files
  through a Server Action: Next limits their body size, and 10 × 50 MB would
  pass through the app server.
- The hosted staging project's global upload limit must be at least 50 MB
  (Storage settings). Check it in step 2. If it's lower, ask the user to raise
  it.
- Keep the existing `Enter` to send, IME, and keep-padding behaviour in
  `composer-field.tsx`.
- Render file names as text only. Never use them in a storage key or HTML
  attribute other than `download`.
- Develop against staging (`npx supabase@latest db push`), and push only after
  an explicit yes.
