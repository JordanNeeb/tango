"use client";

import { ParentWelcome, type WelcomeData } from "./parent-welcome";

// The parent portal's content. Until the first co-parent accepts, it is the
// welcome page; parent content for families comes in later features.
export function ParentDashboard({
  welcome,
  inviteError,
}: {
  welcome?: WelcomeData;
  inviteError?: string;
}) {
  return welcome ? <ParentWelcome welcome={welcome} inviteError={inviteError} /> : null;
}
