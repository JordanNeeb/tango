"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { Cog6ToothIcon, LanguageIcon } from "@heroicons/react/24/outline";
import { useActionState, useState } from "react";

import { LANGUAGES } from "@/components/common/language-menu";
import { type LanguageResult, setLanguage } from "@/lib/i18n/actions";
import { useLanguage, useMessages } from "@/lib/i18n/language-provider";

const itemClass =
  "flex w-full items-center gap-x-3 px-3 py-1.5 text-left text-sm/6 text-gray-900 hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-hidden dark:text-white dark:hover:bg-white/5 dark:focus-visible:bg-white/5";

// The sidebar's Settings button opens a dropdown styled like the dashboard's
// account menu. Language is its only setting so far: choosing it swaps the
// dropdown to the list of languages, with a back row to return. A popover is
// used rather than a menu because a menu closes on every item click.
// `compact` is the icon-only button for the narrow dashboard rail.
export function SettingsMenu({ compact = false }: { compact?: boolean }) {
  const { dashboard } = useMessages();

  return (
    <Popover className={compact ? undefined : "-mx-2"}>
      <PopoverButton
        className={`group flex w-full gap-x-3 rounded-md text-sm/6 font-semibold text-gray-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-indigo-500 data-open:bg-white/5 data-open:text-white ${compact ? "p-3" : "p-2"}`}
      >
        <Cog6ToothIcon aria-hidden="true" className="size-6 shrink-0" />
        <span className={compact ? "sr-only" : undefined}>{dashboard.settings}</span>
      </PopoverButton>
      <PopoverPanel
        transition
        focus
        anchor={compact ? "right end" : "top start"}
        className="z-50 w-56 origin-bottom-left rounded-md bg-white py-2 shadow-lg outline outline-gray-900/5 dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10 [--anchor-gap:--spacing(2)] transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
      >
        {/* The panel unmounts when closed, so it always reopens on the top level.
            `focus` moves keyboard focus into it on open; each view's first row
            takes focus when the view switches. */}
        <SettingsPanel />
      </PopoverPanel>
    </Popover>
  );
}

function SettingsPanel() {
  const messages = useMessages();
  const [view, setView] = useState<"settings" | "language">("settings");

  if (view === "settings") {
    return (
      <button type="button" autoFocus onClick={() => setView("language")} className={itemClass}>
        <LanguageIcon aria-hidden="true" className="size-5 shrink-0 text-gray-400" />
        <span className="flex-1">{messages.languageMenu.label}</span>
        <ChevronRightIcon aria-hidden="true" className="size-5 text-gray-400 dark:text-gray-500" />
      </button>
    );
  }

  return (
    <LanguageList
      onBack={() => setView("settings")}
      backLabel={messages.languageMenu.label}
    />
  );
}

function LanguageList({ onBack, backLabel }: { onBack: () => void; backLabel: string }) {
  const lang = useLanguage();
  const [state, formAction, pending] = useActionState<LanguageResult, FormData>(
    setLanguage,
    {},
  );

  return (
    <div>
      <button
        type="button"
        autoFocus
        onClick={onBack}
        className={`${itemClass} border-b border-gray-200 pb-2 font-semibold dark:border-white/10`}
      >
        <ChevronLeftIcon aria-hidden="true" className="size-5 shrink-0 text-gray-400 dark:text-gray-500" />
        {backLabel}
      </button>
      <form action={formAction} className="pt-1">
        {LANGUAGES.map((item) => (
          <button
            key={item.lang}
            type="submit"
            name="lang"
            value={item.lang}
            lang={item.lang}
            disabled={pending || item.lang === lang}
            aria-current={item.lang === lang ? "true" : undefined}
            className={`${itemClass} justify-between disabled:cursor-default`}
          >
            {item.name}
            {item.lang === lang ? (
              <CheckIcon aria-hidden="true" className="size-4 text-indigo-600 dark:text-indigo-500" />
            ) : null}
          </button>
        ))}
      </form>
      {state.formError ? (
        <p role="alert" className="mx-2 mt-2 rounded-md bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300">
          {state.formError}
        </p>
      ) : null}
    </div>
  );
}
