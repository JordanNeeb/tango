"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
} from "@headlessui/react";
import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import {
  Bars3Icon,
  BellIcon,
  type HomeIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { type ReactNode, useRef, useState } from "react";

import { signOut } from "@/app/[lang]/(auth)/actions";
import { Logo } from "@/components/common/logo";
import { useOnShown } from "@/components/conversations/message-status";
import { useMessages } from "@/lib/i18n/language-provider";

import { SettingsMenu } from "./settings-menu";
import { useShellUi } from "./ui-context";

// Ported from the Tailwind Plus application shell
// (design/references/tailwind-plus/application/dashboard-light.jsx and
// dashboard-dark.jsx). It follows the OS theme, except the sidebar, which is
// dark in both themes as in the references.
// The shell holds what every signed-in page shares: the logo, search and
// notifications (still the reference's placeholders), the user's name,
// Settings (language), Your profile, and Sign out. It stays mounted in the
// `(app)` layout while pages change. A page that sets an `aside` through the
// UI context (`ShellPage`) switches it to the multi-column layout
// (design/references/tailwind-plus/application/multi-column-dashboard-light.jsx and -dark.jsx):
// an icon rail on desktop and a secondary column beside the content from
// 1050px (the `split` breakpoint).

export type NavigationItem = {
  name: string;
  href: string;
  // Any Heroicons outline icon; they all share this type.
  icon: typeof HomeIcon;
  current: boolean;
  // A count badge, such as unread messages; hidden at 0. `onCountShown` runs
  // whenever the badge is on screen in a visible tab, and again when
  // `countKey` (what's being counted) changes.
  count?: number;
  countKey?: string;
  onCountShown?: () => void;
};

export type TeamItem = {
  id: number;
  name: string;
  href: string;
  initial: string;
  current: boolean;
};

const SIGN_OUT_FORM_ID = "dashboard-sign-out";

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// Styled after the count badge in Tailwind Plus's dark sidebar navigation (not
// among the saved references). On the rail it sits on the icon's corner. Screen readers hear "{count} unread" after the item's name.
function CountBadge({ item, rail }: { item: NavigationItem; rail?: boolean }) {
  const { dashboard } = useMessages();
  const ref = useRef<HTMLSpanElement>(null);
  const count = item.count ?? 0;
  useOnShown(ref, () => item.onCountShown?.(), item.countKey);
  const label = dashboard.navigation.unread.replace("{count}", String(count));
  return (
    <span
      ref={ref}
      className={classNames(
        rail
          ? "absolute top-1.5 right-1.5 min-w-4 rounded-full bg-indigo-500 px-1 text-center text-[0.625rem]/4 text-white"
          : "ml-auto w-9 min-w-max rounded-full bg-gray-900 px-2.5 py-0.5 text-center text-xs/5 font-medium whitespace-nowrap text-white outline-1 -outline-offset-1 outline-white/15",
      )}
    >
      <span aria-hidden="true">{count > 99 ? "99+" : count}</span>
      <span className="sr-only">, {label}</span>
    </span>
  );
}

// The sidebar contents, shared by the mobile dialog and the desktop column.
function Sidebar({
  className,
  navigation,
  teams,
}: {
  className: string;
  navigation: NavigationItem[];
  teams?: TeamItem[];
}) {
  const { dashboard } = useMessages();
  return (
    <div className={className}>
      <div className="relative flex h-16 shrink-0 items-center">
        <Logo onDark small href="/dashboard" className="pl-0.5" />
      </div>
      <nav className="relative flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    aria-current={item.current ? "page" : undefined}
                    className={classNames(
                      item.current
                        ? "bg-white/5 text-white"
                        : "text-gray-400 hover:bg-white/5 hover:text-white",
                      "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold",
                    )}
                  >
                    <item.icon aria-hidden="true" className="size-6 shrink-0" />
                    {item.name}
                    {item.count ? <CountBadge item={item} /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          {teams ? (
            <li>
              <div className="text-xs/6 font-semibold text-gray-400">
                {dashboard.teamsHeading}
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {teams.map((team) => (
                  <li key={team.id}>
                    <Link
                      href={team.href}
                      className={classNames(
                        team.current
                          ? "bg-white/5 text-white"
                          : "text-gray-400 hover:bg-white/5 hover:text-white",
                        "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold",
                      )}
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[0.625rem] font-medium text-gray-400 group-hover:border-white/20 group-hover:text-white">
                        {team.initial}
                      </span>
                      <span className="truncate">{team.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ) : null}
          <li className="mt-auto">
            <SettingsMenu />
          </li>
        </ul>
      </nav>
    </div>
  );
}

// The desktop sidebar in the multi-column layout: icons only, names for
// screen readers, and Settings at the bottom.
function Rail({ navigation }: { navigation: NavigationItem[] }) {
  return (
    <div className="hidden dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:border-r dark:before:border-white/10 dark:before:bg-black/10 rail:fixed rail:inset-y-0 rail:left-0 rail:z-50 rail:flex rail:w-20 rail:flex-col rail:overflow-y-auto rail:bg-gray-900 rail:pb-4">
      <div className="relative flex h-16 shrink-0 items-center justify-center">
        <Logo mark href="/dashboard" />
      </div>
      <nav className="relative mt-8 flex flex-1 flex-col items-center">
        <ul role="list" className="flex flex-col items-center space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                aria-current={item.current ? "page" : undefined}
                className={classNames(
                  item.current
                    ? "bg-white/5 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-white",
                  "group relative flex gap-x-3 rounded-md p-3 text-sm/6 font-semibold",
                )}
              >
                <item.icon aria-hidden="true" className="size-6 shrink-0" />
                <span className="sr-only">{item.name}</span>
                {item.count ? <CountBadge item={item} rail /> : null}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-auto">
          <SettingsMenu compact />
        </div>
      </nav>
    </div>
  );
}

export function DashboardShell({
  userName,
  navigation,
  teams,
  defaultColumns = false,
  children,
}: {
  userName: string;
  navigation: NavigationItem[];
  teams?: TeamItem[];
  // The layout before the page sets one, such as while it loads.
  defaultColumns?: boolean;
  children?: ReactNode;
}) {
  const { dashboard } = useMessages();
  const ui = useShellUi();
  const { aside, title } = ui;
  const columns = ui.columns ?? defaultColumns;
  // The rail shows from 600px, the full sidebar from lg; below that, the menu
  // button opens the sidebar as a drawer.
  const drawerOnly = columns ? "rail:hidden" : "lg:hidden";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-full bg-white dark:bg-gray-900">
      {/* Sign out lives outside the menu, which unmounts its items when closed. */}
      <form id={SIGN_OUT_FORM_ID} action={signOut} />

      <Dialog
        open={sidebarOpen}
        onClose={setSidebarOpen}
        className={`relative z-50 ${drawerOnly}`}
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="-m-2.5 p-2.5"
                >
                  <span className="sr-only">{dashboard.closeSidebar}</span>
                  <XMarkIcon aria-hidden="true" className="size-6 text-white" />
                </button>
              </div>
            </TransitionChild>

            <Sidebar
              navigation={navigation}
              teams={teams}
              className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 ring-1 ring-white/10 dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:bg-black/10"
            />
          </DialogPanel>
        </div>
      </Dialog>

      {/* Static sidebar for desktop */}
      {columns ? (
        <Rail navigation={navigation} />
      ) : (
        <div className="hidden bg-gray-900 ring-1 ring-white/10 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
          <Sidebar
            navigation={navigation}
            teams={teams}
            className="flex grow flex-col gap-y-5 overflow-y-auto bg-black/10 px-6 pb-4"
          />
        </div>
      )}

      <div className={columns ? "rail:pl-20" : "lg:pl-72"}>
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-xs dark:border-white/10 dark:bg-gray-900 sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className={`-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 ${drawerOnly} dark:text-gray-400 dark:hover:text-white`}
          >
            <span className="sr-only">{dashboard.openSidebar}</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>

          {/* Separator */}
          <div
            aria-hidden="true"
            className={`h-6 w-px bg-gray-900/10 ${drawerOnly} dark:bg-white/10`}
          />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <form action="#" method="GET" className="grid flex-1 grid-cols-1">
              <input
                name="search"
                placeholder={dashboard.search}
                aria-label={dashboard.search}
                className="col-start-1 row-start-1 block size-full bg-white pl-8 text-base text-gray-900 outline-hidden placeholder:text-gray-400 sm:text-sm/6 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
              />
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-400"
              />
            </form>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <span className="sr-only">{dashboard.viewNotifications}</span>
                <BellIcon aria-hidden="true" className="size-6" />
              </button>

              {/* Separator */}
              <div
                aria-hidden="true"
                className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10 dark:lg:bg-gray-100/10"
              />

              {/* Profile dropdown */}
              <Menu as="div" className="relative">
                <MenuButton className="relative flex items-center">
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">{dashboard.openUserMenu}</span>
                  {/* Placeholder avatar from the Tailwind Plus reference. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                    className="size-8 rounded-full bg-gray-50 outline -outline-offset-1 outline-black/5 dark:bg-gray-800 dark:outline-white/10"
                  />
                  <span className="hidden lg:flex lg:items-center">
                    <span
                      aria-hidden="true"
                      className="ml-4 text-sm/6 font-semibold text-gray-900 dark:text-white"
                    >
                      {userName}
                    </span>
                    <ChevronDownIcon
                      aria-hidden="true"
                      className="ml-2 size-5 text-gray-400 dark:text-gray-500"
                    />
                  </span>
                </MenuButton>
                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg outline outline-gray-900/5 transition dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10 data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                >
                  <MenuItem>
                    <Link
                      href="/profile"
                      className="block px-3 py-1 text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden dark:text-white dark:data-focus:bg-white/5"
                    >
                      {dashboard.yourProfile}
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <button
                      type="submit"
                      form={SIGN_OUT_FORM_ID}
                      className="block w-full px-3 py-1 text-left text-sm/6 text-gray-900 data-focus:bg-gray-50 data-focus:outline-hidden dark:text-white dark:data-focus:bg-white/5"
                    >
                      {dashboard.signOut}
                    </button>
                  </MenuItem>
                </MenuItems>
              </Menu>
            </div>
          </div>
        </div>

        <main className={columns ? "split:pl-96" : "py-10"}>
          <h1 className="sr-only">{title ?? dashboard.title}</h1>
          {columns ? (
            children
          ) : (
            <div className="px-4 sm:px-6 lg:px-8">{children}</div>
          )}
        </main>
      </div>

      {columns ? (
        <aside className="fixed top-16 bottom-0 left-20 hidden w-96 overflow-y-auto border-r border-gray-200 split:block dark:border-white/10">
          {aside}
        </aside>
      ) : null}
    </div>
  );
}
