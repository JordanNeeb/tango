"use client";

import { UserPlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import { type WelcomeData } from "@/components/dashboard/parent-welcome";
import { useMessages } from "@/lib/i18n/language-provider";

// Messages for a parent without a co-parent yet: points them to the dashboard,
// where the invite form lives. Follows the layout of the conversations empty
// state, with the button from the Tailwind Plus empty-state reference.
export function NoCoParentPrompt({ welcome }: { welcome: WelcomeData }) {
  const messages = useMessages().conversations.noCoParent;
  const pendingEmail = welcome.sent?.email;
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <UserPlusIcon aria-hidden="true" className="size-12 text-gray-400 dark:text-gray-500" />
      <h2 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{messages.title}</h2>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{messages.description}</p>
      {pendingEmail ? (
        <p className="mt-3 max-w-sm text-sm text-gray-600 dark:text-gray-300">
          {messages.pending.replace("{email}", () => pendingEmail)}
        </p>
      ) : null}
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-x-1.5 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
      >
        {pendingEmail ? messages.viewInvite : messages.invite}
      </Link>
    </div>
  );
}
