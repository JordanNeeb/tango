"use client";

import { type RefObject, useEffect, useEffectEvent } from "react";

import { createClient } from "@/lib/supabase/client";

import { type MessageStatus } from "./types";

// Ids already sent this session, per status. The database keeps only the
// first time anyway; this just saves repeat calls.
const sent = new Set<string>();

// Records the signed-in parent's status for the co-parent's messages. The
// server sets the time and ignores their own messages and other families. A
// failure is logged and the ids are retried on the next call. The database
// takes at most 500 ids a call, so larger sets go in several calls.
const BATCH = 500;

export function recordStatus(kind: MessageStatus, ids: string[]) {
  const fresh = ids.filter((id) => !sent.has(`${kind}:${id}`));
  for (const id of fresh) sent.add(`${kind}:${id}`);

  for (let start = 0; start < fresh.length; start += BATCH) {
    const batch = fresh.slice(start, start + BATCH);
    void createClient()
      .rpc("record_message_receipts", { receipt_kind: kind, message_ids: batch })
      .then(({ error }) => {
        if (!error) return;
        for (const id of batch) sent.delete(`${kind}:${id}`);
        console.error("[messages] status failed", { kind, code: error.code, message: error.message });
      });
  }
}

// Calls `onShown` whenever the element is on screen (any part of it) while the
// tab is visible: again each time either becomes true, and each time `key`
// changes (new content in the same element). Elements hidden with
// `display: none`, such as the closed mobile sidebar, never count.
export function useOnShown(
  ref: RefObject<HTMLElement | null>,
  onShown: () => void,
  key = "",
) {
  const shown = useEffectEvent(onShown);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let onScreen = false;
    const check = () => {
      if (onScreen && document.visibilityState === "visible") shown();
    };
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      check();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", check);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", check);
    };
  }, [ref, key]);
}
