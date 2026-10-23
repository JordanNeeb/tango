"use client";

import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/catalyst/button";
import { TextLink } from "@/components/catalyst/text";
import { type WelcomeData } from "@/components/dashboard/parent-welcome";
import { useMessages } from "@/lib/i18n/language-provider";

// Messages for a parent without a co-parent yet: one section, centered in the
// content area below the header (4rem) and the shell's padding (5rem),
// offering the invite (on the dashboard, where the form lives) or Solo.
// `/upgrade` is the subscription upgrade page, still to be built.
export function NoCoParentPrompt({ welcome }: { welcome: WelcomeData }) {
  const { conversations } = useMessages();
  const messages = conversations.noCoParent;
  const pendingEmail = welcome.sent?.email;
  const [beforeUpgrade, afterUpgrade] = messages.description.split("{upgrade}");
  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col items-center justify-center text-center">
      <ChatBubbleLeftRightIcon aria-hidden="true" className="size-12 text-gray-400 dark:text-gray-500" />
      <h2 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
        {conversations.emptyTitle}
      </h2>
      <p className="mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400">
        {beforeUpgrade}
        <TextLink href="/upgrade">{messages.upgrade}</TextLink>
        {afterUpgrade}
      </p>
      {pendingEmail ? (
        <p className="mt-3 max-w-md text-sm text-gray-600 dark:text-gray-300">
          {messages.pending.replace("{email}", () => pendingEmail)}
        </p>
      ) : null}
      <Button color="indigo" href="/dashboard" className="mt-6">
        {pendingEmail ? messages.viewInvite : messages.invite}
      </Button>
    </div>
  );
}
