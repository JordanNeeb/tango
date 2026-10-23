"use client";

import { useMemo, useSyncExternalStore } from "react";

import { useLanguage } from "@/lib/i18n/language-provider";

function subscribeNever() {
  return () => {};
}

function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
}

// Formats message dates in the page language and the browser's time zone. The
// time zone is unknown on the server, so every value is empty until hydration
// to keep server and client output identical.
export function useDateFormat() {
  const language = useLanguage();
  const timeZone = useSyncExternalStore(subscribeNever, browserTimeZone, () => "");

  return useMemo(() => {
    const locale = language === "fr" ? "fr-CA" : "en-CA";
    const make = (options: Intl.DateTimeFormatOptions) =>
      timeZone ? new Intl.DateTimeFormat(locale, { ...options, timeZone }) : null;
    const time = make({ hour: "numeric", minute: "2-digit" });
    const day = make({ weekday: "long", month: "long", day: "numeric" });
    const shortDay = make({ month: "short", day: "numeric" });
    const dayKey = make({ year: "numeric", month: "2-digit", day: "2-digit" });

    const keyOf = (iso: string) => dayKey?.format(new Date(iso)) ?? "";

    return {
      time: (iso: string) => time?.format(new Date(iso)) ?? "",
      day: (iso: string) => day?.format(new Date(iso)) ?? "",
      dayKey: keyOf,
      // Today's messages show their time; older ones their date.
      listDate: (iso: string) => {
        if (!time || !shortDay) return "";
        const date = new Date(iso);
        return keyOf(iso) === keyOf(new Date().toISOString())
          ? time.format(date)
          : shortDay.format(date);
      },
    };
  }, [language, timeZone]);
}
