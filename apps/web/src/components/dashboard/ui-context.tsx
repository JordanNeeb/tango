"use client";

import { SUPPORTED_LANGUAGES } from "@tango/shared";
import { usePathname } from "next/navigation";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useLayoutEffect,
  useState,
} from "react";

// What the current page tells the shared shell: the multi-column layout with
// its secondary column, or the full sidebar, and the screen reader title.
// `columns` is unset until a page says, and the shell then uses its default.
export type ShellUi = {
  columns?: boolean;
  aside?: ReactNode;
  title?: string;
};

const UNSET: ShellUi = {};

const UiContext = createContext<ShellUi>(UNSET);
const SetUiContext = createContext<Dispatch<SetStateAction<ShellUi>>>(() => {});

const LANGUAGE_PREFIX = new RegExp(`^/(${SUPPORTED_LANGUAGES.join("|")})(?=/|$)`);

// The pathname without the language segment. On the server it is the
// proxy's rewritten path (`/en/messages`), in the browser the visible one
// (`/messages`); both must render the same.
export function useAppPath(): string {
  return usePathname().replace(LANGUAGE_PREFIX, "") || "/";
}

export function isMessagesPath(path: string): boolean {
  return path === "/messages" || path.startsWith("/messages/");
}

export function UiProvider({ children }: { children?: ReactNode }) {
  const [ui, setUi] = useState<ShellUi>(UNSET);
  return (
    <SetUiContext value={setUi}>
      <UiContext value={ui}>{children}</UiContext>
    </SetUiContext>
  );
}

export function useShellUi(): ShellUi {
  return useContext(UiContext);
}

// Sets the shell's layout for as long as the page is shown. Without `aside`
// the page uses the full sidebar.
export function ShellPage({
  aside,
  title,
  children,
}: {
  aside?: ReactNode;
  title?: string;
  children?: ReactNode;
}) {
  const setUi = useContext(SetUiContext);
  useLayoutEffect(() => {
    setUi({ columns: aside !== undefined, aside, title });
  }, [setUi, aside, title]);
  useLayoutEffect(() => () => setUi(UNSET), [setUi]);
  return children;
}
