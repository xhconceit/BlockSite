import type { ProviderInfo } from "./types";

export const PROVIDER_INFO_LIST: ProviderInfo[] = [
  {
    key: "anthropic",
    name: "Anthropic (Claude)",
    description: "Claude models via Anthropic API",
    requiresBaseUrl: false,
    defaultModel: "claude-sonnet-4-5",
    models: ["claude-opus-4-7", "claude-sonnet-4-5", "claude-haiku-4-5"],
  },
  {
    key: "openai",
    name: "OpenAI",
    description: "GPT models via OpenAI API",
    requiresBaseUrl: false,
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o4-mini"],
  },
  {
    key: "ollama",
    name: "Ollama (Local)",
    description: "Self-hosted models via Ollama. Requires a running Ollama server.",
    requiresBaseUrl: true,
    defaultModel: "llama3",
    models: ["llama3", "mistral", "gemma3", "qwen3"],
  },
  {
    key: "openrouter",
    name: "OpenRouter",
    description: "Multi-provider gateway with many models",
    requiresBaseUrl: false,
    defaultModel: "anthropic/claude-sonnet-4-5",
    models: [
      "anthropic/claude-sonnet-4-5",
      "anthropic/claude-haiku-4-5",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "google/gemini-2.5-pro",
      "deepseek/deepseek-chat",
    ],
  },
  {
    key: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek V4 — 1M context, MoE architecture, open-source",
    requiresBaseUrl: false,
    defaultModel: "deepseek-v4-pro",
    models: ["deepseek-v4-pro", "deepseek-v4-flash", "deepseek-chat", "deepseek-reasoner"],
  },
];
