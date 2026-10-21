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
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Bars3Icon, BellIcon, type HomeIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { type ReactNode, useState } from "react";

import { signOut } from "@/app/[lang]/(auth)/actions";
import { Logo } from "@/components/common/logo";
import { useMessages } from "@/lib/i18n/language-provider";

import { SettingsMenu } from "./settings-menu";

// Ported from the dark Tailwind Plus application shell
// (design/references/tailwind-plus/application/dashboard-dark.jsx). It is always
// dark until a dark-mode toggle exists; dashboard-light.jsx is kept for that.
// The shell holds what every dashboard shares: the logo, search and
// notifications (still the reference's placeholders), the user's name,
// Settings (language), Your profile, and Sign out. Each dashboard passes its
// own sidebar navigation, optional teams, and content. Passing `aside` switches
// to the multi-column layout
// (design/references/tailwind-plus/application/multi-column-dashboard-dark.jsx):
// an icon rail on desktop and a secondary column beside the content at xl.

export type NavigationItem = {
  name: string;
  href: string;
  // Any Heroicons outline icon; they all share this type.
  icon: typeof HomeIcon;
  current: boolean;
};

export type TeamItem = { id: number; name: string; href: string; initial: string; current: boolean };

const SIGN_OUT_FORM_ID = "dashboard-sign-out";

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
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
        <Logo onDark href="/dashboard" />
      </div>
      <nav className="relative flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <a
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
                  </a>
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
                    <a
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
                    </a>
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
    <div className="hidden before:pointer-events-none before:absolute before:inset-0 before:border-r before:border-white/10 before:bg-black/10 lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-20 lg:flex-col lg:overflow-y-auto lg:bg-gray-900 lg:pb-4">
      <div className="relative flex h-16 shrink-0 items-center justify-center">
        <Logo mark href="/dashboard" />
      </div>
      <nav className="relative mt-8 flex flex-1 flex-col items-center">
        <ul role="list" className="flex flex-col items-center space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <a
                href={item.href}
                aria-current={item.current ? "page" : undefined}
                className={classNames(
                  item.current
                    ? "bg-white/5 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-white",
                  "group flex gap-x-3 rounded-md p-3 text-sm/6 font-semibold",
                )}
              >
                <item.icon aria-hidden="true" className="size-6 shrink-0" />
                <span className="sr-only">{item.name}</span>
              </a>
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
  title,
  aside,
  children,
}: {
  userName: string;
  navigation: NavigationItem[];
  teams?: TeamItem[];
  title?: string;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  const { dashboard } = useMessages();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-full bg-gray-900">
      {/* Sign out lives outside the menu, which unmounts its items when closed. */}
      <form id={SIGN_OUT_FORM_ID} action={signOut} />

      <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 lg:hidden">
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
              className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4 ring-1 ring-white/10 before:pointer-events-none before:absolute before:inset-0 before:bg-black/10"
            />
          </DialogPanel>
        </div>
      </Dialog>

      {/* Static sidebar for desktop */}
      {aside ? (
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

      <div className={aside ? "lg:pl-20" : "lg:pl-72"}>
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/10 bg-gray-900 px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-gray-400 hover:text-white lg:hidden"
          >
            <span className="sr-only">{dashboard.openSidebar}</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>

          {/* Separator */}
          <div aria-hidden="true" className="h-6 w-px bg-white/10 lg:hidden" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <form action="#" method="GET" className="grid flex-1 grid-cols-1">
              <input
                name="search"
                placeholder={dashboard.search}
                aria-label={dashboard.search}
                className="col-start-1 row-start-1 block size-full bg-gray-900 pl-8 text-base text-white outline-hidden placeholder:text-gray-500 sm:text-sm/6"
              />
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-gray-400"
              />
            </form>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button type="button" className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-300">
                <span className="sr-only">{dashboard.viewNotifications}</span>
                <BellIcon aria-hidden="true" className="size-6" />
              </button>

              {/* Separator */}
              <div
                aria-hidden="true"
                className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-100/10"
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
                    className="size-8 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10"
                  />
                  <span className="hidden lg:flex lg:items-center">
                    <span
                      aria-hidden="true"
                      className="ml-4 text-sm/6 font-semibold text-white"
                    >
                      {userName}
                    </span>
                    <ChevronDownIcon aria-hidden="true" className="ml-2 size-5 text-gray-500" />
                  </span>
                </MenuButton>
                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-gray-800 py-2 outline -outline-offset-1 outline-white/10 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                >
                  <MenuItem>
                    <Link
                      href="/profile"
                      className="block px-3 py-1 text-sm/6 text-white data-focus:bg-white/5 data-focus:outline-hidden"
                    >
                      {dashboard.yourProfile}
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <button
                      type="submit"
                      form={SIGN_OUT_FORM_ID}
                      className="block w-full px-3 py-1 text-left text-sm/6 text-white data-focus:bg-white/5 data-focus:outline-hidden"
                    >
                      {dashboard.signOut}
                    </button>
                  </MenuItem>
                </MenuItems>
              </Menu>
            </div>
          </div>
        </div>

        <main className={aside ? "xl:pl-96" : "py-10"}>
          <h1 className="sr-only">{title ?? dashboard.title}</h1>
          {aside ? children : <div className="px-4 sm:px-6 lg:px-8">{children}</div>}
        </main>
      </div>

      {aside ? (
        <aside className="fixed top-16 bottom-0 left-20 hidden w-96 overflow-y-auto border-r border-white/10 xl:block">
          {aside}
        </aside>
      ) : null}
    </div>
  );
}
