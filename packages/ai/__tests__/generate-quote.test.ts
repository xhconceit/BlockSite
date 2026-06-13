import { describe, it, expect, vi } from "vitest";
import type { Category } from "@blocksite/core";
import { generateQuote } from "../src/generate-quote";

const { apiKeys, settings, stats } = vi.hoisted(() => ({
  apiKeys: { get: vi.fn() },
  settings: { get: vi.fn() },
  stats: { getDailyStats: vi.fn() },
}));

vi.mock("@blocksite/storage", () => ({
  apiKeys,
  settings,
  stats,
}));

vi.mock("../src/providers", () => ({
  callAI: vi.fn(),
}));

import { callAI } from "../src/providers";

describe("generateQuote", () => {
  it("returns generated quote text and author", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic" });
    stats.getDailyStats.mockResolvedValue({
      date: "2026-06-13",
      totalBlocks: 5,
      byCategory: { social: 3, video: 2 } as Record<Category, number>,
      byRule: {},
      byHour: {},
    });
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify({
        text: "Focus on what matters most.",
        author: "BlockSite AI",
      }),
    );

    const result = await generateQuote("social" as Category);
    expect(result.text).toBe("Focus on what matters most.");
    expect(result.author).toBe("BlockSite AI");
  });

  it("handles zero block count", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic" });
    stats.getDailyStats.mockResolvedValue(undefined);
    vi.mocked(callAI).mockResolvedValue(JSON.stringify({ text: "Stay focused.", author: "" }));

    const result = await generateQuote("custom" as Category);
    expect(result.text).toBe("Stay focused.");
  });
});
