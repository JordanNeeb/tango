import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => ({ data: session.userId ? { claims: { sub: session.userId } } : null }),
    },
  }),
}));

const { proxy } = await import("./proxy");

function visit(path: string, { cookie = "", acceptLanguage = "" } = {}) {
  return proxy(
    new NextRequest(`http://localhost:3000${path}`, {
      headers: { cookie, "accept-language": acceptLanguage },
    }),
  );
}

const redirectedTo = (response: Response) => response.headers.get("location");
const rewrittenTo = (response: Response) => response.headers.get("x-middleware-rewrite");

beforeEach(() => {
  session.userId = null;
});

describe("proxy language", () => {
  it("rewrites pages to the cookie's language", async () => {
    const response = await visit("/pricing", { cookie: "tango-lang=fr" });
    expect(rewrittenTo(response)).toBe("http://localhost:3000/fr/pricing");
    expect(response.cookies.get("tango-lang")).toBeUndefined();
  });

  it("rewrites the home page without a trailing slash", async () => {
    const response = await visit("/", { cookie: "tango-lang=en" });
    expect(rewrittenTo(response)).toBe("http://localhost:3000/en");
  });

  it("picks the browser's language and remembers it when there's no cookie", async () => {
    const response = await visit("/pricing", { acceptLanguage: "fr-CA,fr;q=0.9" });
    expect(rewrittenTo(response)).toBe("http://localhost:3000/fr/pricing");
    expect(response.cookies.get("tango-lang")).toMatchObject({ value: "fr", httpOnly: true });
  });

  it("replaces an unknown cookie value", async () => {
    const response = await visit("/pricing", { cookie: "tango-lang=de", acceptLanguage: "de" });
    expect(rewrittenTo(response)).toBe("http://localhost:3000/en/pricing");
    expect(response.cookies.get("tango-lang")?.value).toBe("en");
  });

  it("leaves auth route handlers unlocalized", async () => {
    const response = await visit("/auth/callback?code=x", { cookie: "tango-lang=fr" });
    expect(rewrittenTo(response)).toBeNull();
    expect(redirectedTo(response)).toBeNull();
  });
});

describe("proxy routing", () => {
  it.each([
    ["/dashboard", "/sign-in"],
    ["/profile", "/sign-in"],
    ["/messages", "/sign-in"],
    ["/messages/123?x=1", "/sign-in"],
    ["/reset-password", "/forgot-password"],
    ["/sign-up", "/get-started"],
    ["/sign-up?type=admin", "/get-started"],
  ])("sends a signed-out visitor from %s to %s", async (path, target) => {
    const response = await visit(path);
    expect(redirectedTo(response)).toBe(`http://localhost:3000${target}`);
  });

  it.each(["/", "/get-started", "/sign-in", "/sign-up?type=parent", "/pricing", "/forgot-password"])(
    "lets a signed-out visitor open %s",
    async (path) => {
      expect(redirectedTo(await visit(path))).toBeNull();
    },
  );

  it.each(["/", "/get-started", "/sign-in", "/sign-up"])(
    "sends a signed-in parent from %s to the dashboard",
    async (path) => {
      session.userId = "u1";
      expect(redirectedTo(await visit(path))).toBe("http://localhost:3000/dashboard");
    },
  );

  it.each(["/dashboard", "/messages/123", "/profile", "/reset-password", "/pricing"])(
    "lets a signed-in parent open %s",
    async (path) => {
      session.userId = "u1";
      expect(redirectedTo(await visit(path))).toBeNull();
    },
  );

  it("sets a new visitor's language cookie on a redirect too", async () => {
    const response = await visit("/dashboard", { acceptLanguage: "fr" });
    expect(redirectedTo(response)).toBe("http://localhost:3000/sign-in");
    expect(response.cookies.get("tango-lang")?.value).toBe("fr");
  });
});
