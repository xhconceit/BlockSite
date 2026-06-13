import { describe, it, expect, vi } from "vitest";
import { categorizeSite } from "../src/categorize";
import { AIParseError } from "../src/types";

const { apiKeys, settings } = vi.hoisted(() => ({
  apiKeys: {
    get: vi.fn(),
  },
  settings: {
    get: vi.fn(),
  },
}));

vi.mock("@blocksite/storage", () => ({
  apiKeys,
  settings,
}));

vi.mock("../src/providers", () => ({
  callAI: vi.fn(),
}));

import { callAI } from "../src/providers";

describe("categorizeSite", () => {
  it("parses valid AI response into CategorizationResult", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic", model: "claude-sonnet-4-5" });
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify({
        category: "social",
        confidence: 0.95,
        reasoning: "Twitter is a social media platform.",
      }),
    );

    const result = await categorizeSite("twitter.com");
    expect(result.category).toBe("social");
    expect(result.confidence).toBe(0.95);
    expect(result.reasoning).toBe("Twitter is a social media platform.");
  });

  it("clamps confidence to 0-1 range", async () => {
    settings.get.mockResolvedValue({ provider: "openai", model: "gpt-4o" });
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify({ category: "video", confidence: 1.5, reasoning: "" }),
    );

    const result = await categorizeSite("youtube.com");
    expect(result.confidence).toBe(1);
  });

  it("falls back to custom for invalid category", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic" });
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify({
        category: "unknown-category",
        confidence: 0.8,
        reasoning: "",
      }),
    );

    const result = await categorizeSite("example.com");
    expect(result.category).toBe("custom");
  });

  it("throws AIParseError on invalid JSON", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic" });
    vi.mocked(callAI).mockResolvedValue("not json at all");

    await expect(categorizeSite("example.com")).rejects.toThrow(AIParseError);
  });
});
