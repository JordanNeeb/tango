"use server";

import { FunctionsHttpError } from "@supabase/supabase-js";
import { type Messages } from "@tango/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult, readText, validateEmail } from "@/lib/auth/validation";
import { requestMessages } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

type InviteErrors = Messages["invite"]["errors"];

// The browser sends its time zone; the database checks it again. Anything the
// server can't use falls back to Toronto, the family's time zone until it can be
// changed.
const FALLBACK_TIME_ZONE = "America/Toronto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function timeZoneOrFallback(value: string): string {
  if (!value) return FALLBACK_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

// Database functions raise a stable code as the message; these are the ones a
// parent can cause. Anything else is unexpected.
function inviteErrorMessage(code: string | undefined, errors: InviteErrors): string | undefined {
  switch (code) {
    case "name_required":
      return errors.nameRequired;
    case "self_invite":
      return errors.selfInvite;
    case "already_paired":
      return errors.alreadyPaired;
    case "pending_exists":
      return errors.pendingExists;
    case "invite_limit":
      return errors.inviteLimit;
    case "too_soon":
      return errors.tooSoon;
    case "send_limit":
      return errors.sendLimit;
    case "send_failed":
      return errors.sendFailed;
    case "invite_unavailable":
      return errors.unavailable;
    case "email_mismatch":
      return errors.emailMismatch;
    default:
      return undefined;
  }
}

function failure(
  action: string,
  code: string | undefined,
  messages: Messages,
  detail?: Record<string, unknown>,
): ActionResult {
  const known = inviteErrorMessage(code, messages.invite.errors);
  if (known) return { formError: known };
  console.error(`[invite] ${action} failed`, { code, ...detail });
  return { formError: messages.auth.errors.unexpected };
}

async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/sign-in");
  return supabase;
}

// Emails the invite through the Edge Function and returns its error code, if any.
async function sendInviteEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inviteId: string,
): Promise<string | undefined> {
  const { error } = await supabase.functions.invoke("send-family-invite", {
    body: { inviteId },
  });
  if (!error) return undefined;
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: unknown };
      if (typeof body.error === "string") return body.error;
    } catch {
      // Not our JSON shape; treated as unexpected below.
    }
  }
  return `function:${error.name}`;
}

export async function sendInvite(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const messages = await requestMessages();
  const { email, error } = validateEmail(readText(formData, "coparent"), {
    ...messages.auth.errors,
    emailRequired: messages.dashboard.welcome.emailRequired,
  });
  if (error) return { fieldErrors: { email: error }, values: { email } };

  const supabase = await signedInClient();
  const { data: inviteId, error: createError } = await supabase.rpc("create_family_invite", {
    email,
    time_zone: timeZoneOrFallback(readText(formData, "timeZone")),
  });
  if (createError || !inviteId) {
    return { ...failure("create", createError?.message, messages), values: { email } };
  }

  // The invite exists even if the email fails; the pending card then offers
  // Send again.
  revalidatePath("/dashboard");
  revalidatePath("/messages");
  const sendError = await sendInviteEmail(supabase, inviteId);
  if (sendError) return failure("send", sendError, messages);
  return { notice: messages.dashboard.welcome.sent };
}

export async function resendInvite(
  _previous: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const messages = await requestMessages();
  const inviteId = readText(formData, "inviteId");
  if (!UUID.test(inviteId)) return failure("resend", "invalid_request", messages);

  const supabase = await signedInClient();
  const sendError = await sendInviteEmail(supabase, inviteId);
  revalidatePath("/dashboard");
  revalidatePath("/messages");
  if (sendError) return failure("resend", sendError, messages);
  return { notice: messages.dashboard.welcome.sent };
}
