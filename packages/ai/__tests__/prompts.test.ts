import { describe, it, expect } from "vitest";
import type { Category, BlockedItem, DailyStats } from "@blocksite/core";
import {
  categorizeSitePrompt,
  generateQuotePrompt,
  parseNLRulePrompt,
  analyzeStatsPrompt,
} from "../src/prompts";

describe("categorizeSitePrompt", () => {
  it("returns system and user messages", () => {
    const result = categorizeSitePrompt("twitter.com");
    expect(result.system).toContain("BlockSite");
    expect(result.user).toContain("twitter.com");
    expect(result.user).toContain("category");
    expect(result.user).toContain("confidence");
  });
});

describe("generateQuotePrompt", () => {
  it("returns system and user with category and block count", () => {
    const result = generateQuotePrompt("social" as Category, 5);
    expect(result.system).toContain("BlockSite");
    expect(result.user).toContain("social");
    expect(result.user).toContain("5");
    expect(result.user).toContain('"text"');
    expect(result.user).toContain('"author"');
  });

  it("handles singular block count", () => {
    const result = generateQuotePrompt("social" as Category, 1);
    expect(result.user).toContain("1 time");
  });
});

describe("parseNLRulePrompt", () => {
  it("returns system and user with NL input and existing rules", () => {
    const existing: BlockedItem[] = [
      {
        id: "1",
        type: "domain",
        value: "facebook.com",
        category: "social" as Category,
        enabled: true,
        order: 0,
        createdAt: 0,
        updatedAt: 0,
      },
    ];
    const result = parseNLRulePrompt("block all social media", existing);
    expect(result.system).toContain("BlockSite");
    expect(result.user).toContain("block all social media");
    expect(result.user).toContain("facebook.com");
    expect(result.user).toContain('"rules"');
    expect(result.user).toContain('"explanation"');
  });

  it("handles empty existing rules", () => {
    const result = parseNLRulePrompt("block youtube", []);
    expect(result.user).toContain("no existing rules");
  });
});

describe("analyzeStatsPrompt", () => {
  it("returns system and user with stats data", () => {
    const stats: DailyStats[] = [
      {
        date: "2026-06-13",
        totalBlocks: 10,
        byCategory: { social: 5, video: 3, game: 2 } as Record<Category, number>,
        byRule: {},
        byHour: { "9": 5, "10": 5 },
      },
    ];
    const rules: BlockedItem[] = [];
    const result = analyzeStatsPrompt(stats, rules);
    expect(result.system).toContain("BlockSite");
    expect(result.user).toContain("2026-06-13");
    expect(result.user).toContain("10 total blocks");
    expect(result.user).toContain('"insights"');
    expect(result.user).toContain('"summary"');
  });

  it("handles empty stats", () => {
    const result = analyzeStatsPrompt([], []);
    expect(result.user).toContain("no data yet");
  });
});
