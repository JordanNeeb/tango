"use client";

import { useMessages } from "@/lib/i18n/language-provider";

import { DashboardShell, type TeamItem } from "./dashboard-shell";
import { parentNavigation } from "./parent-navigation";
import { ParentWelcome, type WelcomeData } from "./parent-welcome";

// The parent portal. Teams are still the Tailwind Plus reference's
// placeholders. Until the first co-parent accepts, the content is
// the welcome page; parent content for families comes in later features.
export function ParentDashboard({
  userName,
  welcome,
  inviteError,
}: {
  userName: string;
  welcome?: WelcomeData;
  inviteError?: string;
}) {
  const { dashboard } = useMessages();

  const teams: TeamItem[] = [
    { id: 1, name: dashboard.teams.heroicons, href: "#", initial: "H", current: false },
    { id: 2, name: dashboard.teams.tailwindLabs, href: "#", initial: "T", current: false },
    { id: 3, name: dashboard.teams.workcation, href: "#", initial: "W", current: false },
  ];

  return (
    <DashboardShell userName={userName} navigation={parentNavigation(dashboard, "dashboard")} teams={teams}>
      {welcome ? <ParentWelcome welcome={welcome} inviteError={inviteError} /> : null}
    </DashboardShell>
  );
}
