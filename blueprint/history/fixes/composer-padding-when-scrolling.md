# Fix: Composer padding when scrolling

**Type:** Fix
**Status:** verified
**Branch:** fix/composer-padding-when-scrolling

## The problem

The message composer (`apps/web/src/components/conversations/composer-field.tsx`,
used by the chat and the new message screen) grows to 4 lines, then scrolls.
On the fifth line, the text sits flush against the bottom edge with no padding
below it. The textarea carries its own padding, and when it scrolls, browsers
scroll the caret to the very bottom of the textarea's box, ignoring its bottom
padding.

## The fix

- Move the box's look to a wrapper `div`: rounded corners, background, outline,
  and `px-4 py-2.5` padding. Its outline turns Tango blue while the textarea
  has focus (`focus-within`) and red when it's invalid. The textarea inside has
  no padding, background, or outline of its own. It grows with `field-sizing:
  content` from one line to exactly 4 (`max-h-[4lh]`), then scrolls inside.
  The padding sits outside the scrolling area, so there's always space below
  the last line. Typing at the end keeps the newest line in view, because the
  browser scrolls to the caret.
- The one-line height stays 44px (24px line plus 20px padding), and the send
  button stays aligned to the bottom.
- Must not break: Enter to send, Shift+Enter, the disabled and pending states,
  the field error, light and dark mode, and the 4-line cap.

## Build steps

- [x] **1. Pad the composer outside its scrolling area**
  - Wrap the textarea and move the box styling to the wrapper as above.
  - Done when: typecheck, lint, and build pass; with 5 or more lines, the
    newest line has the same padding below it as the first line had above.

## Verify

1. Run `npm run dev:web` and open a conversation.
2. Type with Shift+Enter until the box stops growing at 4 lines, then keep
   going. Each new line appears with padding below it, and the box stays
   scrolled to the newest line.
3. Focus and blur the box: the outline turns Tango blue and back. Send with
   Enter: the box clears to one line.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":2040,"specSha256":"72298326fa561798cf917e8197674cced203aeda9219d640ebab48681cf68542","branch":"refs/heads/fix/composer-padding-when-scrolling","head":"001ef909285f18b2dd3eaf928b9e5d402258ff09","baseRef":"refs/heads/dev","baseCommit":"e3b69ab61d5c569d6ff1827fc8fd4f6c31e26621","sourceTree":"4d3dddf82de944b054081c799ab4e9d64139ee9b","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Run `npm run dev:web` and open a conversation.
2. Type with Shift+Enter until the box stops growing at 4 lines, then keep
   adding lines. Each new line has padding below it, and the box stays
   scrolled to the newest line.
3. Focus and blur the box: the outline turns Tango blue and back. Press Enter
   to send: the box clears to one line.
