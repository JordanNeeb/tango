"use client";

import { HomeIcon } from "@heroicons/react/24/outline";
import { type ReactNode } from "react";

import { useMessagesActivity } from "@/components/conversations/use-messages-activity";
import { useMessages } from "@/lib/i18n/language-provider";

import { DashboardShell, type NavigationItem, type TeamItem } from "./dashboard-shell";
import { parentNavigation } from "./parent-navigation";
import { isMessagesPath, useAppPath } from "./ui-context";

// The signed-in user's shell, kept by the `(app)` layout across pages. Parents
// get the parent sidebar with the live unread badge; on the messages pages
// each new message also re-renders the page's server data, and a parent with
// a family gets the rail. Professionals get
// their single item. `accountType` is null when the profile failed to load,
// which shows no navigation. Teams are still the Tailwind Plus reference's
// placeholders.
export function AppShell({
  userName,
  accountType,
  familyId,
  children,
}: {
  userName: string;
  accountType: "parent" | "professional" | null;
  familyId: string | null;
  children: ReactNode;
}) {
  const { dashboard } = useMessages();
  const onMessages = isMessagesPath(useAppPath());
  const unread = useMessagesActivity(accountType === "parent" ? familyId : null, {
    refresh: onMessages,
  });

  let navigation: NavigationItem[] = [];
  let teams: TeamItem[] | undefined;
  if (accountType === "parent") {
    navigation = parentNavigation(dashboard, onMessages ? "messages" : "dashboard", unread);
    teams = [
      { id: 1, name: dashboard.teams.heroicons, href: "#", initial: "H", current: false },
      { id: 2, name: dashboard.teams.tailwindLabs, href: "#", initial: "T", current: false },
      { id: 3, name: dashboard.teams.workcation, href: "#", initial: "W", current: false },
    ];
  } else if (accountType === "professional") {
    navigation = [
      { name: dashboard.navigation.dashboard, href: "/dashboard", icon: HomeIcon, current: true },
    ];
  }

  return (
    <DashboardShell
      userName={userName}
      navigation={navigation}
      teams={teams}
      defaultColumns={onMessages && accountType === "parent" && familyId !== null}
    >
      {children}
    </DashboardShell>
  );
}

// The bare shell while the user loads on a hard load. The family isn't known
// yet, so the messages pages guess the rail most parents get.
export function AppShellFallback() {
  return (
    <DashboardShell userName="" navigation={[]} defaultColumns={isMessagesPath(useAppPath())} />
  );
}
