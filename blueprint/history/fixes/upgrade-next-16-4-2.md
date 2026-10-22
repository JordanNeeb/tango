# Fix: Upgrade Next.js 16.4.2

**Type:** Fix
**Status:** verified
**Branch:** fix/upgrade-next-16-4-2

## The problem

The web app pins `next` 16.4.0, which is affected by a published Next.js
security advisory. 16.4.2 is the patched release in the same major version.

## The fix

- Pin `next` and `eslint-config-next` to exactly `16.4.2` in
  `apps/web/package.json`, and refresh `package-lock.json`. Only the Next.js
  packages change in the lockfile.
- Set `experimental.agentUpgrade: "security"` in `apps/web/next.config.ts`,
  which 16.4.2 supports. Leave the rest of the config unchanged.
- Same-major patch: no codemods, migration guide, or application code changes.

**Must not break:**
- the production build and its route table (Cache Components and Partial
  Prefetching still enabled)
- the proxy's language rewrite (no language in the URL) and auth redirects
- typecheck and lint across the workspaces

## Build steps

- [x] **1. Upgrade Next.js and set the agent upgrade policy**
  - Install `next@16.4.2` and `eslint-config-next@16.4.2` exactly, from the
    workspace root, and add `experimental.agentUpgrade`.
  - Done when:
    - `next --version` in `apps/web` reports v16.4.2
    - `npm run typecheck`, `npm run lint:web` and `npm run build:web` pass
    - with `next start`, `/` and `/sign-in` return 200, `/sign-up` and
      `/dashboard` redirect when signed out, and `Accept-Language: fr` renders
      `<html lang="fr">`

## Verify

1. Run `npm install`, then `npm run dev:web`. The terminal shows Next.js 16.4.2.
2. Open http://localhost:3000, sign in, and open the dashboard. Everything
   works as before.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":1633,"specSha256":"bf842694ab10df3af9964125dff00c63e5fb1523c709f84abaf5de2411fd8e3c","branch":"refs/heads/fix/upgrade-next-16-4-2","head":"1da8336ece50b139e8598d9ddbd6c1600129835d","baseRef":"refs/heads/dev","baseCommit":"ae67a64b97f6a5bbf23032faab4c810bc23b0a16","sourceTree":"0ad468300f41ab4e563d7fb9c7e0dd2c6d4b900b","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. In the repo root, run `npm install`, then `npm run dev:web`.
2. The terminal banner reads **Next.js 16.4.2**.
3. Open http://localhost:3000 and sign in. The dashboard loads as before.
