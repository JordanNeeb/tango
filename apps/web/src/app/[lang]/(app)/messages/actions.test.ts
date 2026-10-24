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

const { sendMessage, startConversation } = await import("./actions");

const errors = getMessages("en").conversations.errors;
const empty = {};
const FAMILY = "123e4567-e89b-12d3-a456-426614174000";
const CONVERSATION = "223e4567-e89b-12d3-a456-426614174000";
const raised = (message: string) => ({ error: { code: "P0001", message } });

beforeEach(() => {
  resetRequest();
  nextCache.revalidatePath.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("startConversation", () => {
  const valid = { familyId: FAMILY, subject: "  Pickup ", body: "\n See you at 5 \n" };

  it("validates the subject and body and re-shows them cleaned", async () => {
    expect(await startConversation(empty, formData({ familyId: FAMILY, subject: " ", body: " " }))).toEqual({
      fieldErrors: { subject: errors.subjectRequired, body: errors.bodyRequired },
      values: { subject: "", body: "" },
    });
  });

  it("rejects a malformed family id without calling the database", async () => {
    const supabase = fakeSupabase({ userId: "u1" });
    resetRequest(supabase);
    expect(await startConversation(empty, formData({ ...valid, familyId: "x" }))).toEqual({
      formError: errors.unavailable,
      values: { subject: "Pickup", body: "See you at 5" },
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("sends a signed-out parent to sign-in", async () => {
    await expectRedirect(startConversation(empty, formData(valid)), "/sign-in");
  });

  it("starts the conversation and opens it", async () => {
    const supabase = fakeSupabase({ userId: "u1", rpcs: { start_conversation: { data: CONVERSATION } } });
    resetRequest(supabase);
    await expectRedirect(startConversation(empty, formData(valid)), `/messages/${CONVERSATION}`);
    expect(supabase.rpc).toHaveBeenCalledWith("start_conversation", {
      target_family_id: FAMILY,
      conversation_subject: "Pickup",
      message_body: "See you at 5",
      attachments: [],
    });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/[lang]/(app)/messages", "layout");
  });

  it.each([
    ["invalid_subject", { fieldErrors: { subject: errors.subjectRequired } }],
    ["invalid_body", { fieldErrors: { body: errors.bodyRequired } }],
    ["not_member", { formError: errors.unavailable }],
    ["something_else", { formError: errors.sendFailed }],
  ])("maps %s", async (code, expected) => {
    resetRequest(fakeSupabase({ userId: "u1", rpcs: { start_conversation: raised(code) } }));
    expect(await startConversation(empty, formData(valid))).toEqual({
      ...expected,
      values: { subject: "Pickup", body: "See you at 5" },
    });
  });

  it("fails when no conversation id comes back", async () => {
    resetRequest(fakeSupabase({ userId: "u1", rpcs: { start_conversation: { data: null } } }));
    expect(await startConversation(empty, formData(valid))).toMatchObject({ formError: errors.sendFailed });
  });
});

describe("sendMessage", () => {
  const valid = { conversationId: CONVERSATION, body: " Running late \n" };

  it("validates the body", async () => {
    expect(await sendMessage(empty, formData({ conversationId: CONVERSATION, body: " " }))).toEqual({
      fieldErrors: { body: errors.bodyRequired },
      values: { body: "" },
    });
  });

  it("rejects a malformed conversation id", async () => {
    expect(await sendMessage(empty, formData({ ...valid, conversationId: "x" }))).toEqual({
      formError: errors.unavailable,
      values: { body: "Running late" },
    });
  });

  it("sends the message and reports when", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);
    const supabase = fakeSupabase({ userId: "u1", rpcs: { send_message: {} } });
    resetRequest(supabase);
    expect(await sendMessage(empty, formData(valid))).toEqual({ sentAt: 1234 });
    expect(supabase.rpc).toHaveBeenCalledWith("send_message", {
      target_conversation_id: CONVERSATION,
      message_body: "Running late",
      attachments: [],
    });
    expect(nextCache.revalidatePath).toHaveBeenCalledWith("/[lang]/(app)/messages", "layout");
  });

  it("keeps the text when sending fails", async () => {
    resetRequest(fakeSupabase({ userId: "u1", rpcs: { send_message: raised("not_member") } }));
    expect(await sendMessage(empty, formData(valid))).toEqual({
      formError: errors.unavailable,
      values: { body: "Running late" },
    });
  });
});

describe("attachments", () => {
  const FILE = "323e4567-e89b-12d3-a456-426614174000";
  const PATH = `${FAMILY}/${FILE}`;
  const withFiles = (fields: Record<string, string>, files: [string, string][]) => {
    const data = formData(fields);
    for (const [path, name] of files) {
      data.append("attachmentPath", path);
      data.append("attachmentName", name);
    }
    return data;
  };

  it("sends a message that is only attachments", async () => {
    const supabase = fakeSupabase({ userId: "u1", rpcs: { send_message: {} } });
    resetRequest(supabase);
    const result = await sendMessage(
      empty,
      withFiles({ conversationId: CONVERSATION, body: "   " }, [[PATH, " photo.jpg "]]),
    );
    expect(result).toHaveProperty("sentAt");
    expect(supabase.rpc).toHaveBeenCalledWith("send_message", {
      target_conversation_id: CONVERSATION,
      message_body: "",
      attachments: [{ path: PATH, name: "photo.jpg" }],
    });
  });

  it("starts a conversation with attachments and no text", async () => {
    const supabase = fakeSupabase({ userId: "u1", rpcs: { start_conversation: { data: CONVERSATION } } });
    resetRequest(supabase);
    await expectRedirect(
      startConversation(empty, withFiles({ familyId: FAMILY, subject: "Report card", body: "" }, [[PATH, "card.pdf"]])),
      `/messages/${CONVERSATION}`,
    );
    expect(supabase.rpc).toHaveBeenCalledWith("start_conversation", {
      target_family_id: FAMILY,
      conversation_subject: "Report card",
      message_body: "",
      attachments: [{ path: PATH, name: "card.pdf" }],
    });
  });

  it("refuses a malformed path without calling the database", async () => {
    const supabase = fakeSupabase({ userId: "u1" });
    resetRequest(supabase);
    expect(
      await sendMessage(empty, withFiles({ conversationId: CONVERSATION, body: "Here" }, [["../x", "a.jpg"]])),
    ).toEqual({ formError: errors.attachFailed, values: { body: "Here" } });
    expect(
      await startConversation(
        empty,
        withFiles({ familyId: FAMILY, subject: "S", body: "Here" }, [[`${PATH}/x`, "a.jpg"]]),
      ),
    ).toEqual({ formError: errors.attachFailed, values: { subject: "S", body: "Here" } });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("maps the database refusing the files and keeps the text", async () => {
    resetRequest(
      fakeSupabase({ userId: "u1", rpcs: { send_message: raised("invalid_attachments") } }),
    );
    expect(
      await sendMessage(empty, withFiles({ conversationId: CONVERSATION, body: "Here" }, [[PATH, "a.jpg"]])),
    ).toEqual({ formError: errors.attachFailed, values: { body: "Here" } });
  });

  it("still needs text or a file", async () => {
    expect(await sendMessage(empty, withFiles({ conversationId: CONVERSATION, body: "" }, []))).toEqual({
      fieldErrors: { body: errors.bodyRequired },
      values: { body: "" },
    });
  });
});
