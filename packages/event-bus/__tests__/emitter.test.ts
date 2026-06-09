import { describe, it, expect, vi } from "vitest";
import { emitter } from "../src/index";

describe("TypedEmitter", () => {
  it("delivers events to subscribers", () => {
    const handler = vi.fn();
    const unsub = emitter.on("toggle:changed", handler);
    emitter.emit("toggle:changed", { enabled: true });
    expect(handler).toHaveBeenCalledWith({ enabled: true });
    unsub();
  });

  it("does not deliver after unsubscribe", () => {
    const handler = vi.fn();
    const unsub = emitter.on("toggle:changed", handler);
    unsub();
    emitter.emit("toggle:changed", { enabled: false });
    expect(handler).not.toHaveBeenCalled();
  });

  it("delivers to multiple subscribers", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const u1 = emitter.on("rules:applied", h1);
    const u2 = emitter.on("rules:applied", h2);
    emitter.emit("rules:applied", { count: 5 });
    expect(h1).toHaveBeenCalledWith({ count: 5 });
    expect(h2).toHaveBeenCalledWith({ count: 5 });
    u1();
    u2();
  });

  it("isolates errors — one handler error does not prevent others", () => {
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    const u1 = emitter.on("rule:updated", bad);
    const u2 = emitter.on("rule:updated", good);
    emitter.emit("rule:updated", {
      item: {
        id: "x",
        type: "domain",
        value: "test.com",
        enabled: true,
        category: "custom",
        customMessage: "",
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    });
    expect(good).toHaveBeenCalled();
    u1();
    u2();
  });

  it("off removes specific handler only", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    emitter.on("rule:removed", h1);
    emitter.on("rule:removed", h2);
    emitter.off("rule:removed", h1);
    emitter.emit("rule:removed", { id: "x" });
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it("emit with no subscribers does not throw", () => {
    expect(() => {
      emitter.emit("rules:cleared", undefined);
    }).not.toThrow();
  });
});
