// Emails one co-parent invite. The caller's JWT scopes the checks:
// mark_family_invite_sent confirms the caller sent the invite and limits sending
// to once a minute and 10 times in all. Only then is the token read with the service-role key,
// because clients can't read tokens (following the link accepts the invite).
// Sends through Resend when RESEND_API_KEY is set (staging and production),
// otherwise through local Mailpit's send API.
import { createClient } from "npm:@supabase/supabase-js@2.117.3";

type ErrorCode = "invalid_request" | "too_soon" | "send_limit" | "invite_unavailable" | "send_failed";

const STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  too_soon: 429,
  send_limit: 429,
  invite_unavailable: 404,
  send_failed: 502,
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fail(code: ErrorCode) {
  return json({ error: code }, STATUS[code]);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildEmail(inviterName: string, link: string) {
  const name = escapeHtml(inviterName);
  const href = escapeHtml(link);
  const subject = "Join your co-parent on Tango / Rejoignez votre coparent sur Tango";
  const text = [
    `${inviterName} invited you to be co-parents on Tango.`,
    `Accept the invite: ${link}`,
    "This invite expires in 7 days.",
    "",
    `${inviterName} vous a invité à être coparents sur Tango.`,
    `Acceptez l'invitation : ${link}`,
    "Cette invitation expire dans 7 jours.",
  ].join("\n");
  const html = `<p>${name} invited you to be co-parents on Tango.</p>
<p><a href="${href}">Accept the invite</a></p>
<p>This invite expires in 7 days.</p>
<hr>
<p lang="fr">${name} vous a invité à être coparents sur Tango.</p>
<p lang="fr"><a href="${href}">Accepter l'invitation</a></p>
<p lang="fr">Cette invitation expire dans 7 jours.</p>`;
  return { subject, text, html };
}

async function send(to: string, email: { subject: string; text: string; html: string }) {
  const from = Deno.env.get("INVITE_FROM_EMAIL") ?? "Tango <no-reply@tango.local>";
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    return await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], ...email }),
    });
  }
  const mailpit = Deno.env.get("MAILPIT_URL") ?? "http://supabase_inbucket_tango:8025";
  const fromAddress = from.match(/<([^>]+)>/)?.[1] ?? from;
  return await fetch(`${mailpit}/api/v1/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      From: { Email: fromAddress, Name: "Tango" },
      To: [{ Email: to }],
      Subject: email.subject,
      Text: email.text,
      HTML: email.html,
    }),
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return fail("invalid_request");

  let inviteId: unknown;
  try {
    ({ inviteId } = await request.json());
  } catch {
    return fail("invalid_request");
  }
  if (typeof inviteId !== "string" || !UUID.test(inviteId)) return fail("invalid_request");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: request.headers.get("Authorization") ?? "" } } },
  );

  const { error: markError } = await supabase.rpc("mark_family_invite_sent", {
    invite_id: inviteId,
  });
  if (markError) {
    if (markError.message === "too_soon") return fail("too_soon");
    if (markError.message === "send_limit") return fail("send_limit");
    if (markError.message === "invite_unavailable") return fail("invite_unavailable");
    console.error("[send-family-invite] mark failed", { code: markError.code });
    return fail("send_failed");
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: invite, error: inviteError } = await admin
    .from("family_invites")
    .select("token, invited_email, invited_by")
    .eq("id", inviteId)
    .single();
  if (inviteError || !invite) {
    console.error("[send-family-invite] invite read failed", { code: inviteError?.code });
    return fail("invite_unavailable");
  }

  const { data: inviter } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", invite.invited_by)
    .single();

  const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:3000";
  const email = buildEmail(inviter?.name?.trim() || "Your co-parent", `${siteUrl}/auth/invite/${invite.token}`);

  try {
    const response = await send(invite.invited_email, email);
    if (!response.ok) {
      console.error("[send-family-invite] provider rejected", { status: response.status });
      return fail("send_failed");
    }
  } catch (error) {
    console.error("[send-family-invite] provider unreachable", { message: String(error) });
    return fail("send_failed");
  }

  return json({});
});
