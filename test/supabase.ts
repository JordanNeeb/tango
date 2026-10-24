import { vi } from "vitest";

type Result = { data?: unknown; error?: { code?: string; message: string } | null };

// A Supabase query stand-in: every builder method (select, eq, order, ...)
// records its arguments and returns the query, and awaiting it gives `result`.
export function fakeQuery(result: Result) {
  const calls: [string, unknown[]][] = [];
  const query: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (resolve: (value: Result) => unknown) =>
            resolve({ data: result.data ?? null, error: result.error ?? null });
        }
        if (prop === "calls") return calls;
        return (...args: unknown[]) => {
          calls.push([String(prop), args]);
          return query;
        };
      },
    },
  );
  return query as Record<string, (...args: unknown[]) => unknown> & {
    calls: [string, unknown[]][];
  };
}

// A client whose `from(table)` hands out the queued queries for that table in
// order, and whose `rpc(name)` answers from `rpcs`.
export function fakeSupabase({
  tables = {},
  rpcs = {},
  userId = null,
}: {
  tables?: Record<string, Result[]>;
  rpcs?: Record<string, Result>;
  userId?: string | null;
} = {}) {
  const queues = Object.fromEntries(Object.entries(tables).map(([t, r]) => [t, [...r]]));
  const queries: Record<string, ReturnType<typeof fakeQuery>[]> = {};
  const client = {
    from: vi.fn((table: string) => {
      const next = queues[table]?.shift();
      if (!next) throw new Error(`unexpected query on ${table}`);
      const query = fakeQuery(next);
      (queries[table] ??= []).push(query);
      return query;
    }),
    rpc: vi.fn(async (name: string) => {
      const result = rpcs[name];
      if (!result) throw new Error(`unexpected rpc ${name}`);
      return { data: result.data ?? null, error: result.error ?? null };
    }),
    auth: {
      getClaims: vi.fn(async () => ({ data: userId ? { claims: { sub: userId } } : null })),
    },
    queries,
  };
  return client;
}

// Next's redirect() throws to stop rendering; tests read the target from it.
export class RedirectError extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}

export function formData(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return form;
}
