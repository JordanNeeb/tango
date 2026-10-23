import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { AppShell, AppShellFallback } from "@/components/dashboard/app-shell";
import { UiProvider } from "@/components/dashboard/ui-context";
import { loadFamilyId } from "@/lib/families";
import { requestMessages } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

// Loads what the shell shows (name, account type, and the parent's family for
// the unread badge) once, for every signed-in page. The layout stays mounted
// across client navigations, so only the page inside it changes. A failed
// profile read shows an error in the bare shell in place of the page.
async function SignedInShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) redirect("/sign-in");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("name, account_type")
    .eq("id", claims.sub)
    .single();

  const userName = profile?.name?.trim() || (claims.email ?? "");

  if (error) {
    console.error("[shell] profile load failed", { code: error.code, message: error.message });
    const { auth } = await requestMessages();
    return (
      <AppShell userName={userName} accountType={null} familyId={null}>
        <p className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-300">
          {auth.errors.unexpected}
        </p>
      </AppShell>
    );
  }

  const accountType = profile.account_type === "professional" ? "professional" : "parent";
  // The badge stays off when the family can't be read; the page shows the error.
  const familyId = accountType === "parent" ? await loadFamilyId(supabase, claims.sub) : null;

  return (
    <AppShell
      userName={userName}
      accountType={accountType}
      familyId={familyId === "error" ? null : familyId}
    >
      {children}
    </AppShell>
  );
}

// The inner fallback is the shell's static chrome, shown only on a hard load
// while the user loads. It reads the pathname, which a conversation URL only
// has at request time, hence the outer boundary.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <UiProvider>
      <Suspense>
        <Suspense fallback={<AppShellFallback />}>
          <SignedInShell>{children}</SignedInShell>
        </Suspense>
      </Suspense>
    </UiProvider>
  );
}
