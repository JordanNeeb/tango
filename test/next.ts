import { expect, vi } from "vitest";

import { fakeSupabase, RedirectError } from "./supabase";

// Stand-ins for next/headers, next/navigation, next/cache, and the server
// Supabase client. A test file wires them up with:
//   vi.mock("next/headers", () => import("<path>/test/next").then((m) => m.nextHeaders));
// and sets `request` before calling the code under test.
export const request = {
  cookies: new Map<string, string>(),
  headers: new Headers(),
  supabase: fakeSupabase(),
};

export const cookieStore = {
  get: (name: string) => {
    const value = request.cookies.get(name);
    return value === undefined ? undefined : { name, value };
  },
  set: vi.fn((name: string, value: string) => {
    request.cookies.set(name, value);
  }),
  delete: vi.fn((options: string | { name: string }) => {
    request.cookies.delete(typeof options === "string" ? options : options.name);
  }),
};

export function resetRequest(supabase = fakeSupabase()) {
  request.cookies = new Map();
  request.headers = new Headers();
  request.supabase = supabase;
  cookieStore.set.mockClear();
  cookieStore.delete.mockClear();
}

export const nextHeaders = {
  cookies: async () => cookieStore,
  headers: async () => request.headers,
};

export const nextNavigation = {
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
};

export const nextCache = { revalidatePath: vi.fn() };

export const supabaseServer = { createClient: async () => request.supabase };

export async function expectRedirect(promise: Promise<unknown>, url: string) {
  await expect(promise).rejects.toThrow(new RedirectError(url));
}
