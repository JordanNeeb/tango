import { type Messages } from "@tango/shared";

type ConversationErrors = Messages["conversations"]["errors"];

// The database enforces the same limits (conversations_and_messages migration).
export const SUBJECT_MAX = 150;
export const BODY_MAX = 10000;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ConversationActionResult = {
  fieldErrors?: { subject?: string; body?: string };
  formError?: string;
  // Submitted text to re-show after React resets the form.
  values?: { subject?: string; body?: string };
  // Changes on each successful send, so the composer can react to it.
  sentAt?: number;
};

export function cleanSubject(raw: string): string {
  return raw.trim();
}

// Inner newlines are kept; only the ends are trimmed, as in the database.
export function cleanBody(raw: string): string {
  return raw.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "");
}

// Counts characters as Postgres's char_length does (code points, not UTF-16 units).
function charLength(text: string): number {
  return Array.from(text).length;
}

export function validateSubject(subject: string, errors: ConversationErrors): string | undefined {
  if (!subject) return errors.subjectRequired;
  if (charLength(subject) > SUBJECT_MAX) return errors.subjectTooLong;
  return undefined;
}

// trim() also removes Unicode whitespace such as the non-breaking space, so a
// body made only of those is blank too (the database's has_visible_text agrees).
export function validateBody(body: string, errors: ConversationErrors): string | undefined {
  if (!body.trim()) return errors.bodyRequired;
  if (charLength(body) > BODY_MAX) return errors.bodyTooLong;
  return undefined;
}
