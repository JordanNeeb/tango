"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import { recordStatus } from "./message-status";

// Live messaging activity for one family on any parent page: the co-parent's
// messages this parent hasn't read (for the unread badge, recorded as
// delivered as soon as they load), refreshed whenever the database broadcasts
// an insert in the family's conversations, messages, or message statuses on
// the private `family:<id>` topic. The broadcast carries no content; what's
// shown is refetched through RLS. With `refresh`, each change also re-renders
// the page's server data. Without a family it does nothing.
export function useMessagesActivity(
  familyId: string | null,
  { refresh = false }: { refresh?: boolean } = {},
): string[] {
  const router = useRouter();
  const [unreadIds, setUnreadIds] = useState<string[]>([]);
  // Read at event time, so the channel depends on the family alone. The
  // router changes on every refresh and Server Action; resubscribing then
  // dropped any change that arrived while the new channel was joining.
  const refreshPage = useEffectEvent(() => {
    if (refresh) router.refresh();
  });

  useEffect(() => {
    if (!familyId) return;
    const supabase = createClient();
    const topic = `family:${familyId}`;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;

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

    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void loadUnread();
        refreshPage();
      }, 300);
    };

    const join = async () => {
      // The server authorizes by topic name, so every mount uses the same one.
      // Realtime hands back an existing channel with that topic, even one a
      // just-unmounted hook is still leaving, so wait for it to go first.
      const leaving = supabase.getChannels().find((c) => c.topic === `realtime:${topic}`);
      if (leaving) await supabase.removeChannel(leaving);
      // Private channels are authorized with the session's token.
      await supabase.realtime.setAuth();
      if (!active) return;

      let joined = false;
      channel = supabase
        .channel(topic, { config: { private: true } })
        .on("broadcast", { event: "change" }, onChange)
        // A failed subscription leaves the pages working on reload only, so say why.
        .subscribe((status, error) => {
          // Rejoining after a dropped connection: catch up on what was missed.
          if (status === "SUBSCRIBED") {
            if (joined) onChange();
            joined = true;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("[messages] live updates unavailable", { status, message: error?.message });
          }
        });
    };

    // A tab coming back to the foreground may have slept through changes.
    const onVisible = () => {
      if (document.visibilityState === "visible") onChange();
    };

    void loadUnread();
    void join();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [familyId]);

  return familyId ? unreadIds : [];
}
