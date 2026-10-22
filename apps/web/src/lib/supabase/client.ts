import { type Database } from "@tango/shared";
import { createBrowserClient } from "@supabase/ssr";

// The browser client, for Realtime and recording message status. It reads the
// session from the auth cookies; `createBrowserClient` reuses one instance.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
