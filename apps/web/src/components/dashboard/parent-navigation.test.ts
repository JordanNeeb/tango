import { getMessages } from "@tango/shared";
import { describe, expect, it, vi } from "vitest";

const recordStatus = vi.fn();
vi.mock("@/components/conversations/message-status", () => ({ recordStatus }));

const { parentNavigation } = await import("./parent-navigation");

const dashboard = getMessages("en").dashboard;

describe("parentNavigation", () => {
  it("marks the current page", () => {
    const onDashboard = parentNavigation(dashboard, "dashboard");
    expect(onDashboard.filter((item) => item.current).map((item) => item.href)).toEqual([
      "/dashboard",
    ]);
    const onMessages = parentNavigation(dashboard, "messages");
    expect(onMessages.filter((item) => item.current).map((item) => item.href)).toEqual([
      "/messages",
    ]);
  });

  it("counts unread messages and records them as received when shown", () => {
    const messages = parentNavigation(dashboard, "dashboard", ["a", "b"]).find(
      (item) => item.href === "/messages",
    )!;
    expect(messages.count).toBe(2);
    expect(messages.countKey).toBe("a,b");

    messages.onCountShown?.();
    expect(recordStatus).toHaveBeenCalledWith("received", ["a", "b"]);
  });

  it("shows no count without unread messages", () => {
    const messages = parentNavigation(dashboard, "dashboard").find(
      (item) => item.href === "/messages",
    )!;
    expect(messages.count).toBe(0);
  });
});
