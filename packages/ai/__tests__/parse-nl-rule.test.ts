import { describe, it, expect, vi } from "vitest";
import { parseNaturalLanguageRule } from "../src/parse-nl-rule";
import { AIParseError } from "../src/types";

const { apiKeys, settings, rules } = vi.hoisted(() => ({
  apiKeys: { get: vi.fn() },
  settings: { get: vi.fn() },
  rules: { getAll: vi.fn() },
}));

vi.mock("@blocksite/storage", () => ({
  apiKeys,
  settings,
  rules,
}));

vi.mock("../src/providers", () => ({
  callAI: vi.fn(),
}));

import { callAI } from "../src/providers";

describe("parseNaturalLanguageRule", () => {
  it("parses NL into structured rules", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic" });
    rules.getAll.mockResolvedValue([]);
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify({
        rules: [
          {
            type: "domain",
            value: "twitter.com",
            category: "social",
            enabled: true,
          },
        ],
        explanation: "Added social media block.",
      }),
    );

    const result = await parseNaturalLanguageRule("block twitter");
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]!.value).toBe("twitter.com");
    expect(result.rules[0]!.category).toBe("social");
  });

  it("strips http and www prefixes from values", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic" });
    rules.getAll.mockResolvedValue([]);
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify({
        rules: [
          {
            type: "domain",
            value: "https://www.twitter.com/",
            category: "social",
            enabled: true,
          },
        ],
        explanation: "",
      }),
    );

    const result = await parseNaturalLanguageRule("block twitter");
    expect(result.rules[0]!.value).toBe("twitter.com");
  });

  it("filters out invalid rule types", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic" });
    rules.getAll.mockResolvedValue([]);
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify({
        rules: [
          {
            type: "invalid",
            value: "test.com",
            category: "custom",
            enabled: true,
          },
          {
            type: "domain",
            value: "example.com",
            category: "custom",
            enabled: true,
          },
        ],
        explanation: "",
      }),
    );

    const result = await parseNaturalLanguageRule("block example");
    expect(result.rules).toHaveLength(1);
    expect(result.rules[0]!.type).toBe("domain");
  });

  it("throws AIParseError on invalid JSON", async () => {
    settings.get.mockResolvedValue({ provider: "anthropic" });
    rules.getAll.mockResolvedValue([]);
    vi.mocked(callAI).mockResolvedValue("not json");

    await expect(parseNaturalLanguageRule("block everything")).rejects.toThrow(AIParseError);
  });
});
