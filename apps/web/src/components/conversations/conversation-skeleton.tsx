"use client";

import { useMessages } from "@/lib/i18n/language-provider";

// Bubble widths, alternating the co-parent's (left) and the parent's (right).
const BUBBLES = [
  { mine: false, width: "w-2/3" },
  { mine: true, width: "w-1/2" },
  { mine: false, width: "w-1/3" },
  { mine: true, width: "w-3/5" },
  { mine: false, width: "w-1/2" },
];

// Shown in the chat column while a conversation loads, in ChatPanel's shape:
// header, messages, composer. The kit has no loading state to port.
export function ConversationSkeleton() {
  const label = useMessages().conversations.loading;
  return (
    <div role="status" className="flex h-full flex-col">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex h-full animate-pulse flex-col">
        <div className="flex items-center gap-x-4 border-b border-gray-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-white/10">
          <div className="size-12 flex-none rounded-full bg-gray-200 dark:bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 max-w-full rounded-sm bg-gray-200 dark:bg-white/10" />
            <div className="h-3 w-32 max-w-full rounded-sm bg-gray-200 dark:bg-white/10" />
          </div>
        </div>
        <div className="flex-1 space-y-6 overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
          {BUBBLES.map((bubble, index) => (
            <div key={index} className={`flex ${bubble.mine ? "justify-end" : ""}`}>
              <div
                className={`h-10 max-w-[75%] rounded-2xl ${bubble.width} ${
                  bubble.mine
                    ? "rounded-br-md bg-indigo-100 dark:bg-indigo-500/20"
                    : "rounded-bl-md bg-gray-200 dark:bg-white/10"
                }`}
              />
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 px-4 py-4 sm:px-6 lg:px-8 dark:border-white/10">
          <div className="flex items-end gap-x-3">
            <div className="h-11 flex-1 rounded-3xl bg-gray-200 dark:bg-white/10" />
            <div className="size-11 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-500/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
