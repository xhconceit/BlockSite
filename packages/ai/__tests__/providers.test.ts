import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AIProvider, ChatMessage } from "../src/types";
import { callAI } from "../src/providers";
import { MissingApiKeyError, AIProviderError } from "../src/types";

const { apiKeys } = vi.hoisted(() => ({
  apiKeys: {
    get: vi.fn(),
  },
}));

vi.mock("@blocksite/storage", () => ({
  apiKeys,
}));

describe("callAI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const messages: ChatMessage[] = [{ role: "user", content: "Hello" }];

  it("throws MissingApiKeyError when no API key configured", async () => {
    apiKeys.get.mockResolvedValue(undefined);

    await expect(callAI("anthropic" as AIProvider, "claude-sonnet-4-5", messages)).rejects.toThrow(
      MissingApiKeyError,
    );
  });

  it("throws MissingApiKeyError when key is empty", async () => {
    apiKeys.get.mockResolvedValue({ provider: "anthropic", key: "" });

    await expect(callAI("anthropic" as AIProvider, "claude-sonnet-4-5", messages)).rejects.toThrow(
      MissingApiKeyError,
    );
  });

  it("throws AIProviderError on non-ok response", async () => {
    apiKeys.get.mockResolvedValue({
      provider: "openai",
      key: "sk-test",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      }),
    );

    await expect(callAI("openai" as AIProvider, "gpt-4o", messages)).rejects.toThrow(
      AIProviderError,
    );
  });

  it("returns text on successful OpenAI response", async () => {
    apiKeys.get.mockResolvedValue({
      provider: "openai",
      key: "sk-test",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Hello back" } }],
          }),
      }),
    );

    const result = await callAI("openai" as AIProvider, "gpt-4o", messages);
    expect(result).toBe("Hello back");
  });

  it("returns text on successful Anthropic response", async () => {
    apiKeys.get.mockResolvedValue({
      provider: "anthropic",
      key: "sk-ant-test",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ type: "text", text: "Hello from Claude" }],
          }),
      }),
    );

    const result = await callAI("anthropic" as AIProvider, "claude-sonnet-4-5", messages);
    expect(result).toBe("Hello from Claude");
  });

  it("uses api key from stored record", async () => {
    apiKeys.get.mockResolvedValue({
      provider: "anthropic",
      key: "sk-ant-stored-key",
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          content: [{ type: "text", text: "Response" }],
        }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await callAI("anthropic" as AIProvider, "claude-sonnet-4-5", messages);

    JSON.parse(mockFetch.mock.calls[0]![1].body as string);
    expect(mockFetch.mock.calls[0]![1].headers["x-api-key"]).toBe("sk-ant-stored-key");
  });
});
