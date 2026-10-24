import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeSupabase } from "../../../../test/supabase";

import { loadConversation, loadConversations } from "./messages-data";

type Client = Parameters<typeof loadConversations>[0];
const client = (fake: ReturnType<typeof fakeSupabase>) => fake as unknown as Client;

const ME = "me-id";
const THEM = "them-id";
const FAMILY = { data: [{ family_id: "f1" }] };
const CONVERSATION_ID = "123e4567-e89b-12d3-a456-426614174000";
const failure = { code: "500", message: "down" };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function preview(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    subject: `Subject ${id}`,
    started_by: ME,
    latest_message_id: `m-${id}`,
    latest_sender_id: THEM,
    latest_body: "Hello",
    latest_created_at: "2026-10-24T12:00:00Z",
    ...overrides,
  };
}

describe("loadConversations", () => {
  it("returns null without a family", async () => {
    const supabase = fakeSupabase({ tables: { family_members: [{ data: [] }] } });
    expect(await loadConversations(client(supabase), ME)).toBeNull();
  });

  it("maps previews, unread flags, and the co-parent's name", async () => {
    const supabase = fakeSupabase({
      tables: {
        family_members: [FAMILY, { data: [{ profiles: { name: "  Alex " } }] }],
        conversation_previews: [
          {
            data: [
              preview("c1"),
              preview("c2", { started_by: THEM, latest_sender_id: ME }),
              preview("c3", { latest_message_id: null, latest_body: null, latest_created_at: null }),
              preview("c4", { subject: null }),
            ],
          },
        ],
        messages: [{ data: [{ conversation_id: "c1" }] }],
      },
      rpcs: { unread_messages: { data: [{ id: "m-c1" }] } },
    });

    expect(await loadConversations(client(supabase), ME)).toEqual({
      familyId: "f1",
      coParentName: "Alex",
      conversations: [
        {
          id: "c1",
          subject: "Subject c1",
          startedBy: "me",
          unread: true,
          latest: { id: "m-c1", sender: "coParent", body: "Hello", createdAt: "2026-10-24T12:00:00Z" },
        },
        {
          id: "c2",
          subject: "Subject c2",
          startedBy: "coParent",
          unread: false,
          latest: { id: "m-c2", sender: "me", body: "Hello", createdAt: "2026-10-24T12:00:00Z" },
        },
        { id: "c3", subject: "Subject c3", startedBy: "me", unread: false, latest: null },
      ],
    });
  });

  it("keeps an empty latest body", async () => {
    const supabase = fakeSupabase({
      tables: {
        family_members: [FAMILY, { data: [] }],
        conversation_previews: [{ data: [preview("c1", { latest_body: "" })] }],
      },
      rpcs: { unread_messages: { data: [] } },
    });
    const result = await loadConversations(client(supabase), ME);
    expect(result).not.toBe("error");
    expect(result && result !== "error" && result.conversations[0].latest?.body).toBe("");
  });

  it("returns a null name when the co-parent has none", async () => {
    const supabase = fakeSupabase({
      tables: {
        family_members: [FAMILY, { data: [{ profiles: { name: "   " } }] }],
        conversation_previews: [{ data: [] }],
      },
      rpcs: { unread_messages: { data: [] } },
    });
    const result = await loadConversations(client(supabase), ME);
    expect(result).toEqual({ familyId: "f1", coParentName: null, conversations: [] });
    expect(supabase.from).not.toHaveBeenCalledWith("messages");
  });

  it("looks up unread messages 100 ids at a time", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => ({ id: `m${i}` }));
    const supabase = fakeSupabase({
      tables: {
        family_members: [FAMILY, { data: [] }],
        conversation_previews: [{ data: [] }],
        messages: [{ data: [] }, { data: [] }, { data: [] }],
      },
      rpcs: { unread_messages: { data: ids } },
    });
    await loadConversations(client(supabase), ME);

    const sizes = supabase.queries.messages.map(
      (query) => (query.calls.find(([name]) => name === "in")![1][1] as string[]).length,
    );
    expect(sizes).toEqual([100, 100, 50]);
  });

  it.each([
    ["the family", { family_members: [{ error: failure }] }, {}],
    [
      "the co-parent",
      { family_members: [FAMILY, { error: failure }], conversation_previews: [{ data: [] }] },
      { unread_messages: { data: [] } },
    ],
    [
      "the previews",
      { family_members: [FAMILY, { data: [] }], conversation_previews: [{ error: failure }] },
      { unread_messages: { data: [] } },
    ],
    [
      "the unread ids",
      { family_members: [FAMILY, { data: [] }], conversation_previews: [{ data: [] }] },
      { unread_messages: { error: failure } },
    ],
    [
      "the unread conversations",
      {
        family_members: [FAMILY, { data: [] }],
        conversation_previews: [{ data: [] }],
        messages: [{ error: failure }],
      },
      { unread_messages: { data: [{ id: "m1" }] } },
    ],
  ])("returns error when reading %s fails", async (_name, tables, rpcs) => {
    const supabase = fakeSupabase({ tables, rpcs });
    expect(await loadConversations(client(supabase), ME)).toBe("error");
  });
});

describe("loadConversation", () => {
  const conversation = {
    data: { id: CONVERSATION_ID, family_id: "f1", subject: "Pickup", started_by: THEM },
  };

  it("returns not-found for a malformed id without querying", async () => {
    const supabase = fakeSupabase();
    expect(await loadConversation(client(supabase), ME, "f1", "nope")).toBe("not-found");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns not-found for a missing conversation or another family's", async () => {
    const missing = fakeSupabase({ tables: { conversations: [{ data: null }] } });
    expect(await loadConversation(client(missing), ME, "f1", CONVERSATION_ID)).toBe("not-found");

    const other = fakeSupabase({ tables: { conversations: [conversation] } });
    expect(await loadConversation(client(other), ME, "f2", CONVERSATION_ID)).toBe("not-found");
  });

  it("returns the messages and the statuses of the parent's latest one", async () => {
    const supabase = fakeSupabase({
      tables: {
        conversations: [conversation],
        messages: [
          {
            data: [
              { id: "m1", sender_id: ME, body: "First", created_at: "t1" },
              { id: "m2", sender_id: ME, body: "Second", created_at: "t2" },
              { id: "m3", sender_id: THEM, body: "Reply", created_at: "t3" },
            ],
          },
        ],
        message_receipts: [
          {
            data: [
              { kind: "delivered", created_at: "d" },
              { kind: "read", created_at: "r" },
              { kind: "replied", created_at: "x" },
            ],
          },
        ],
      },
    });

    expect(await loadConversation(client(supabase), ME, "f1", CONVERSATION_ID)).toEqual({
      id: CONVERSATION_ID,
      subject: "Pickup",
      startedBy: "coParent",
      messages: [
        { id: "m1", sender: "me", body: "First", createdAt: "t1" },
        { id: "m2", sender: "me", body: "Second", createdAt: "t2" },
        { id: "m3", sender: "coParent", body: "Reply", createdAt: "t3" },
      ],
      latestSent: { id: "m2", status: { delivered: "d", read: "r" } },
    });
    expect(supabase.queries.message_receipts[0].calls).toContainEqual(["eq", ["message_id", "m2"]]);
  });

  it("has no latest sent message until the parent sends one", async () => {
    const supabase = fakeSupabase({
      tables: {
        conversations: [conversation],
        messages: [{ data: [{ id: "m1", sender_id: THEM, body: "Hi", created_at: "t1" }] }],
      },
    });
    const result = await loadConversation(client(supabase), ME, "f1", CONVERSATION_ID);
    expect(result).toMatchObject({ latestSent: null });
    expect(supabase.from).not.toHaveBeenCalledWith("message_receipts");
  });

  it.each([
    ["the conversation", { conversations: [{ error: failure }] }],
    ["the messages", { conversations: [conversation], messages: [{ error: failure }] }],
    [
      "the receipts",
      {
        conversations: [conversation],
        messages: [{ data: [{ id: "m1", sender_id: ME, body: "Hi", created_at: "t1" }] }],
        message_receipts: [{ error: failure }],
      },
    ],
  ])("returns error when reading %s fails", async (_name, tables) => {
    const supabase = fakeSupabase({ tables });
    expect(await loadConversation(client(supabase), ME, "f1", CONVERSATION_ID)).toBe("error");
  });
});
