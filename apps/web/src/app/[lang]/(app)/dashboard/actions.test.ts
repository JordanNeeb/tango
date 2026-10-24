import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import { getMessages } from "@tango/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { expectRedirect, nextCache, resetRequest } from "../../../../../../../test/next";
import { fakeSupabase, formData } from "../../../../../../../test/supabase";

vi.mock("next/headers", () => import("../../../../../../../test/next").then((m) => m.nextHeaders));
vi.mock("next/navigation", () =>
  import("../../../../../../../test/next").then((m) => m.nextNavigation),
);
vi.mock("next/cache", () => import("../../../../../../../test/next").then((m) => m.nextCache));
vi.mock("@/lib/supabase/server", () =>
  import("../../../../../../../test/next").then((m) => m.supabaseServer),
);

const { resendInvite, sendInvite } = await import("./actions");

const messages = getMessages("en");
const errors = messages.invite.errors;
const empty = {};
const INVITE = "123e4567-e89b-12d3-a456-426614174000";

// A signed-in client whose invite function answers with `invoke`.
type Invoke = () => Promise<{ error: Error | null }>;

function client(
  rpcs: NonNullable<Parameters<typeof fakeSupabase>[0]>["rpcs"],
  invoke = vi.fn<Invoke>(async () => ({ error: null })),
) {
  const supabase = Object.assign(fakeSupabase({ userId: "u1", rpcs }), { functions: { invoke } });
  resetRequest(supabase);
  return supabase;
}

const httpError = (body: unknown) =>
  new FunctionsHttpError(new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 400 }));

beforeEach(() => {
  resetRequest();
  nextCache.revalidatePath.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sendInvite", () => {
  it("asks for the co-parent's email", async () => {
    expect(await sendInvite(empty, formData({ coparent: " " }))).toEqual({
      fieldErrors: { email: messages.dashboard.welcome.emailRequired },
      values: { email: "" },
    });
    expect(await sendInvite(empty, formData({ coparent: "nope" }))).toEqual({
      fieldErrors: { email: messages.auth.errors.emailInvalid },
      values: { email: "nope" },
    });
  });

  it("sends a signed-out parent to sign-in", async () => {
    await expectRedirect(sendInvite(empty, formData({ coparent: "sam@example.ca" })), "/sign-in");
  });

  it("creates the invite with the browser's time zone and emails it", async () => {
    const invoke = vi.fn<Invoke>(async () => ({ error: null }));
    const supabase = client({ create_family_invite: { data: INVITE } }, invoke);
    const result = await sendInvite(
      empty,
      formData({ coparent: "sam@example.ca", timeZone: "America/Vancouver" }),
    );

    expect(result).toEqual({ notice: messages.dashboard.welcome.sent });
    expect(supabase.rpc).toHaveBeenCalledWith("create_family_invite", {
      email: "sam@example.ca",
      time_zone: "America/Vancouver",
    });
    expect(invoke).toHaveBeenCalledWith("send-family-invite", { body: { inviteId: INVITE } });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it.each(["", "Not/A_Zone"])("falls back to Toronto for the time zone %j", async (timeZone) => {
    const supabase = client({ create_family_invite: { data: INVITE } });
    await sendInvite(empty, formData({ coparent: "sam@example.ca", timeZone }));
    expect(supabase.rpc).toHaveBeenCalledWith("create_family_invite", {
      email: "sam@example.ca",
      time_zone: "America/Toronto",
    });
  });

  it.each([
    ["name_required", errors.nameRequired],
    ["self_invite", errors.selfInvite],
    ["already_paired", errors.alreadyPaired],
    ["pending_exists", errors.pendingExists],
    ["invite_limit", errors.inviteLimit],
    ["something_else", messages.auth.errors.unexpected],
  ])("maps a create failure %s", async (code, formError) => {
    client({ create_family_invite: { error: { code: "P0001", message: code } } });
    expect(await sendInvite(empty, formData({ coparent: "sam@example.ca" }))).toEqual({
      formError,
      values: { email: "sam@example.ca" },
    });
  });

  it.each([
    ["the function's error code", httpError({ error: "send_failed" }), errors.sendFailed],
    ["a body that isn't JSON", httpError("oops"), messages.auth.errors.unexpected],
    ["a network failure", new FunctionsFetchError("down"), messages.auth.errors.unexpected],
  ])("maps an email failure from %s", async (_name, error, formError) => {
    client({ create_family_invite: { data: INVITE } }, vi.fn<Invoke>(async () => ({ error })));
    expect(await sendInvite(empty, formData({ coparent: "sam@example.ca" }))).toEqual({ formError });
  });
});

describe("resendInvite", () => {
  it("rejects a malformed invite id", async () => {
    expect(await resendInvite(empty, formData({ inviteId: "x" }))).toEqual({
      formError: messages.auth.errors.unexpected,
    });
  });

  it("emails the invite again", async () => {
    const invoke = vi.fn<Invoke>(async () => ({ error: null }));
    client({}, invoke);
    expect(await resendInvite(empty, formData({ inviteId: INVITE }))).toEqual({
      notice: messages.dashboard.welcome.sent,
    });
    expect(invoke).toHaveBeenCalledWith("send-family-invite", { body: { inviteId: INVITE } });
  });

  it.each([
    ["too_soon", errors.tooSoon],
    ["send_limit", errors.sendLimit],
    ["invite_unavailable", errors.unavailable],
  ])("maps %s", async (code, formError) => {
    client({}, vi.fn<Invoke>(async () => ({ error: httpError({ error: code }) })));
    expect(await resendInvite(empty, formData({ inviteId: INVITE }))).toEqual({ formError });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
