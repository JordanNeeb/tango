import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { type Messages } from "@tango/shared";
import Link from "next/link";

import { LanguageMenu } from "@/components/common/language-menu";
import { Logo } from "@/components/common/logo";

// Ported from the Tailwind Plus marketing hero
// (design/references/tailwind-plus/marketing/hero.jsx). The logo moves from the
// hero column into an absolutely positioned header with Log in, so it doesn't
// push the hero down. From lg up the hero is at least one screen tall: content is
// centred and the screenshot is cropped to fit, and on short windows the page
// grows and scrolls rather than clipping. The hero is dark in both themes.
export function LandingHero({ messages }: { messages: Messages["landing"] }) {
  return (
    <div className="relative isolate min-h-full overflow-hidden bg-gray-900 lg:flex lg:min-h-dvh lg:flex-col">
      <svg
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-white/10"
      >
        <defs>
          <pattern
            x="50%"
            y={-1}
            id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
            width={200}
            height={200}
            patternUnits="userSpaceOnUse"
          >
            <path d="M.5 200V.5H200" fill="none" />
          </pattern>
        </defs>
        <svg x="50%" y={-1} className="overflow-visible fill-gray-800/20">
          <path
            d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
            strokeWidth={0}
          />
        </svg>
        <rect
          fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)"
          width="100%"
          height="100%"
          strokeWidth={0}
        />
      </svg>
      <div
        aria-hidden="true"
        className="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
      >
        <div
          style={{
            clipPath:
              "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
          }}
          className="aspect-1108/632 w-277 bg-linear-to-r from-[#80caff] to-indigo-600 opacity-20"
        />
      </div>
      <header className="absolute inset-x-0 top-0 z-50">
        <nav
          aria-label={messages.nav.label}
          className="mx-auto flex max-w-7xl items-center justify-between px-6 pt-10 lg:px-8"
        >
          <Logo onDark />
          <div className="flex items-center gap-x-6">
            <LanguageMenu onDark />
            <Link
              href="/sign-in"
              className="text-sm/6 font-semibold text-white"
            >
              {messages.nav.logIn}
            </Link>
          </div>
        </nav>
      </header>
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 sm:pb-32 lg:flex lg:w-full lg:flex-1 lg:items-center lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl shrink-0 lg:mx-0">
          <h1 className="mt-24 text-5xl font-semibold tracking-tight text-pretty text-white sm:mt-32 sm:text-7xl lg:mt-0">
            {messages.headline}
          </h1>
          <p className="mt-8 text-lg font-medium text-pretty text-gray-400 sm:text-xl/8">
            {messages.description}
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Link
              href="/get-started"
              className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {messages.getStarted}
            </Link>
            <a
              href="#"
              className="inline-flex items-center gap-x-1 text-sm/6 font-semibold text-white"
            >
              {messages.learnMore}
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:mt-0 lg:mr-0 lg:ml-10 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            {/* Placeholder from the Tailwind Plus reference until Tango has a screenshot. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={messages.screenshotAlt}
              src="https://tailwindcss.com/plus-assets/img/component-images/dark-project-app-screenshot.png"
              width={2432}
              height={1442}
              className="w-304 rounded-md object-cover object-left-top lg:max-h-[calc(100dvh-12rem)] bg-white/5 shadow-2xl ring-1 ring-white/10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
