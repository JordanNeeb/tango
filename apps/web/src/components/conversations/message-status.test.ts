import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }));

// The module remembers sent ids, so each test gets a fresh copy.
async function load() {
  vi.resetModules();
  return (await import("./message-status")).recordStatus;
}

const flush = () => new Promise((resolve) => setTimeout(resolve));

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ error: null });
});

describe("recordStatus", () => {
  it("sends the ids once per status", async () => {
    const recordStatus = await load();
    recordStatus("read", ["a", "b"]);
    recordStatus("read", ["b", "c"]);
    recordStatus("received", ["a"]);
    await flush();

    expect(rpc.mock.calls).toEqual([
      ["record_message_receipts", { receipt_kind: "read", message_ids: ["a", "b"] }],
      ["record_message_receipts", { receipt_kind: "read", message_ids: ["c"] }],
      ["record_message_receipts", { receipt_kind: "received", message_ids: ["a"] }],
    ]);
  });

  it("makes no call when every id was already sent", async () => {
    const recordStatus = await load();
    recordStatus("read", []);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("splits more than 500 ids into batches", async () => {
    const recordStatus = await load();
    const ids = Array.from({ length: 1201 }, (_, i) => `id-${i}`);
    recordStatus("delivered", ids);
    await flush();

    const sizes = rpc.mock.calls.map(([, args]) => args.message_ids.length);
    expect(sizes).toEqual([500, 500, 201]);
    expect(rpc.mock.calls.flatMap(([, args]) => args.message_ids)).toEqual(ids);
  });

  it("retries ids from a failed call", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const recordStatus = await load();
    rpc.mockResolvedValueOnce({ error: { code: "500", message: "down" } });
    recordStatus("read", ["a"]);
    await flush();
    recordStatus("read", ["a"]);
    await flush();

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledOnce();
  });
});
