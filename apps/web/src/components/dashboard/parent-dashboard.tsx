"use client";

import { useMessagesActivity } from "@/components/conversations/use-messages-activity";
import { useMessages } from "@/lib/i18n/language-provider";

import { DashboardShell, type TeamItem } from "./dashboard-shell";
import { parentNavigation } from "./parent-navigation";
import { ParentWelcome, type WelcomeData } from "./parent-welcome";

// The parent portal. Teams are still the Tailwind Plus reference's
// placeholders. Until the first co-parent accepts, the content is
// the welcome page; parent content for families comes in later features.
export function ParentDashboard({
  userName,
  familyId,
  welcome,
  inviteError,
}: {
  userName: string;
  familyId: string | null;
  welcome?: WelcomeData;
  inviteError?: string;
}) {
  const { dashboard } = useMessages();
  const unread = useMessagesActivity(familyId);

  const teams: TeamItem[] = [
    { id: 1, name: dashboard.teams.heroicons, href: "#", initial: "H", current: false },
    { id: 2, name: dashboard.teams.tailwindLabs, href: "#", initial: "T", current: false },
    { id: 3, name: dashboard.teams.workcation, href: "#", initial: "W", current: false },
  ];

  return (
    <DashboardShell userName={userName} navigation={parentNavigation(dashboard, "dashboard", unread)} teams={teams}>
      {welcome ? <ParentWelcome welcome={welcome} inviteError={inviteError} /> : null}
    </DashboardShell>
  );
}
