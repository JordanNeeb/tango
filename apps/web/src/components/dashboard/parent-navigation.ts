import {
  CalendarIcon,
  ChartPieIcon,
  ChatBubbleLeftRightIcon,
  DocumentDuplicateIcon,
  FolderIcon,
  HomeIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { type Messages } from "@tango/shared";

import { recordStatus } from "@/components/conversations/message-status";

import { type NavigationItem } from "./dashboard-shell";

// The parent sidebar. Items after Messages are still the Tailwind Plus
// reference's placeholders. `unread` is the co-parent's messages this parent
// hasn't read; showing their count records them as received.
export function parentNavigation(
  dashboard: Messages["dashboard"],
  current: "dashboard" | "messages",
  unread: string[] = [],
): NavigationItem[] {
  const { navigation } = dashboard;
  return [
    { name: navigation.dashboard, href: "/dashboard", icon: HomeIcon, current: current === "dashboard" },
    {
      name: navigation.messages,
      href: "/messages",
      icon: ChatBubbleLeftRightIcon,
      current: current === "messages",
      count: unread.length,
      countKey: unread.join(","),
      onCountShown: () => recordStatus("received", unread),
    },
    { name: navigation.team, href: "#", icon: UsersIcon, current: false },
    { name: navigation.projects, href: "#", icon: FolderIcon, current: false },
    { name: navigation.calendar, href: "#", icon: CalendarIcon, current: false },
    { name: navigation.documents, href: "#", icon: DocumentDuplicateIcon, current: false },
    { name: navigation.reports, href: "#", icon: ChartPieIcon, current: false },
  ];
}
