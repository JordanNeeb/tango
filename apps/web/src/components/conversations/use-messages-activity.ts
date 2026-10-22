"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { recordStatus } from "./message-status";

const TABLES = ["conversations", "messages", "message_receipts"] as const;

// Live messaging activity for one family on any parent page: the co-parent's
// messages this parent hasn't read (for the unread badge, recorded as
// delivered as soon as they load), refreshed on every insert in the family's
// conversations, messages, or message statuses. With `refresh`, each insert also
// re-renders the page's server data. Realtime checks RLS for each subscriber;
// the family filter only narrows the stream. Without a family it does nothing.
export function useMessagesActivity(
  familyId: string | null,
  { refresh = false }: { refresh?: boolean } = {},
): string[] {
  const router = useRouter();
  const [unreadIds, setUnreadIds] = useState<string[]>([]);

  useEffect(() => {
    if (!familyId) return;
    const supabase = createClient();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const loadUnread = async () => {
      const { data, error } = await supabase.rpc("unread_messages", { target_family_id: familyId });
      if (!active) return;
      if (error) {
        console.error("[messages] unread load failed", { code: error.code, message: error.message });
        return;
      }
      const ids = data.map((row) => row.id);
      setUnreadIds(ids);
      recordStatus("delivered", ids);
    };

    void loadUnread();

    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void loadUnread();
        if (refresh) router.refresh();
      }, 300);
    };

    // A topic per mount: Realtime hands back an existing channel with the same
    // topic, and one from a just-unmounted hook may still be leaving, which
    // would leave this mount without a subscription.
    const channel = supabase.channel(`family-messages:${familyId}:${crypto.randomUUID()}`);
    for (const table of TABLES) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `family_id=eq.${familyId}` },
        onChange,
      );
    }
    channel.subscribe();

    return () => {
      active = false;
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [familyId, refresh, router]);

  return familyId ? unreadIds : [];
}
