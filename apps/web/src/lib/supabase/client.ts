import { type Database } from "@tango/shared";
import { createBrowserClient } from "@supabase/ssr";

// The browser client, for Realtime and recording message status. It reads the
// session from the auth cookies; `createBrowserClient` reuses one instance.
// Browsers throttle timers in background tabs, so Realtime's heartbeats run in
// a Web Worker (realtime-js's built-in script, no extra download), as Supabase
// recommends for background apps. A dropped socket reconnects through the
// library's own retry, and the activity hook catches up when its channel
// rejoins or the tab becomes visible.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { realtime: { worker: true } },
  );
}
