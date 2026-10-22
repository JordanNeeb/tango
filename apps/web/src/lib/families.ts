import "server-only";

import { type WelcomeData } from "@/components/dashboard/parent-welcome";
import { type createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// The family a parent's pages show: their earliest-joined one until co-parent
// switching (feature 5c). Null when they have no family yet.
export async function loadFamilyId(
  supabase: Supabase,
  userId: string,
): Promise<string | null | "error"> {
  const { data, error } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .order("family_id", { ascending: true })
    .limit(1);
  if (error) {
    console.error("[family] load failed", { code: error.code, message: error.message });
    return "error";
  }
  return data[0]?.family_id ?? null;
}

// The welcome page for a parent without a family: the invite they sent, if
// it's still pending.
export async function loadWelcome(
  supabase: Supabase,
  userId: string,
  hasName: boolean,
): Promise<WelcomeData | "error"> {
  const { data: sent, error } = await supabase
    .from("family_invites")
    .select("id, invited_email, expires_at, time_zone")
    .eq("invited_by", userId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[family] invites load failed", { code: error.code, message: error.message });
    return "error";
  }

  const latest = sent[0];
  return {
    hasName,
    sent: latest
      ? {
          id: latest.id,
          email: latest.invited_email,
          expiresAt: latest.expires_at,
          timeZone: latest.time_zone,
        }
      : null,
  };
}
