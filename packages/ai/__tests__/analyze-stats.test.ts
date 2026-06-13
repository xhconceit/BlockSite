import { describe, it, expect, vi } from "vitest";
import type { Category } from "@blocksite/core";
import { analyzeStats } from "../src/analyze-stats";
import { AIParseError } from "../src/types";

const { apiKeys, settings, stats, rules } = vi.hoisted(() => ({
  apiKeys: { get: vi.fn() },
  settings: { get: vi.fn() },
  stats: { getAllDailyStats: vi.fn() },
  rules: { getAll: vi.fn() },
}));

vi.mock("@blocksite/storage", () => ({
  apiKeys,
  settings,
  stats,
  rules,
}));

vi.mock("../src/providers", () => ({
  callAI: vi.fn(),
}));

import { callAI } from "../src/providers";

describe("analyzeStats", () => {
  it("returns empty insights for no data", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic" });
    stats.getAllDailyStats.mockResolvedValue([]);
    rules.getAll.mockResolvedValue([]);

    const result = await analyzeStats("2026-06-01", "2026-06-13");
    expect(result.insights).toHaveLength(0);
    expect(result.summary).toContain("No blocking data");
  });

  it("parses AI response into insights", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic" });
    stats.getAllDailyStats.mockResolvedValue([
      {
        date: "2026-06-13",
        totalBlocks: 20,
        byCategory: { social: 15, video: 5 },
        byRule: {},
        byHour: {},
      },
    ]);
    rules.getAll.mockResolvedValue([]);
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify({
        insights: [
          {
            title: "Peak distraction at 10am",
            description: "Most blocks happen around 10am.",
            severity: "warning",
            actionable: true,
          },
        ],
        summary: "Social media is your main distraction.",
      }),
    );

    const result = await analyzeStats("2026-06-01", "2026-06-13");
    expect(result.insights).toHaveLength(1);
    expect(result.insights[0]!.severity).toBe("warning");
    expect(result.summary).toBe("Social media is your main distraction.");
  });

  it("throws AIParseError on invalid JSON", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic" });
    stats.getAllDailyStats.mockResolvedValue([
      {
        date: "2026-06-13",
        totalBlocks: 10,
        byCategory: {} as Record<Category, number>,
        byRule: {},
        byHour: {},
      },
    ]);
    rules.getAll.mockResolvedValue([]);
    vi.mocked(callAI).mockResolvedValue("not json");

    await expect(analyzeStats("2026-06-01", "2026-06-13")).rejects.toThrow(AIParseError);
  });
});
