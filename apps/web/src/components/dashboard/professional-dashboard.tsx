"use client";

import { HomeIcon } from "@heroicons/react/24/outline";

import { Heading, Subheading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { useMessages } from "@/lib/i18n/language-provider";

import { DashboardShell, type NavigationItem } from "./dashboard-shell";

// The professional portal. Until the portal exists (feature 28) its home
// explains that parents will invite them.
export function ProfessionalDashboard({ userName }: { userName: string }) {
  const { dashboard } = useMessages();
  const messages = dashboard.professional;

  const navigation: NavigationItem[] = [
    { name: dashboard.navigation.dashboard, href: "#", icon: HomeIcon, current: true },
  ];

  return (
    <DashboardShell userName={userName} navigation={navigation}>
      <div className="rounded-lg bg-white p-6 shadow-xs dark:bg-white/5 dark:shadow-none dark:ring-1 dark:ring-white/10">
        {/* A replacer function inserts the name literally, so `$` patterns in it aren't expanded. */}
        <Heading level={2}>{messages.welcome.replace("{name}", () => userName)}</Heading>
        <Subheading level={3} className="mt-6">
          {messages.emptyTitle}
        </Subheading>
        <Text className="mt-2 max-w-prose">{messages.emptyDescription}</Text>
      </div>
    </DashboardShell>
  );
}
