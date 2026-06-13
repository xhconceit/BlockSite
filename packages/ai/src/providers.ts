import { apiKeys, settings } from "@blocksite/storage";
import type { AIProvider, ChatMessage, AICallLog } from "./types";
import { MissingApiKeyError, AIProviderError } from "./types";

interface ProviderClient {
  chat(apiKey: string, model: string, messages: ChatMessage[], baseUrl?: string): Promise<string>;
}

const anthropicClient: ProviderClient = {
  async chat(apiKey, model, messages) {
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      messages: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (systemMsg !== undefined) {
      body["system"] = systemMsg.content;
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new AIProviderError(res.status, "anthropic", text);
    }

    const data = (await res.json()) as {
      content: { type: string; text: string }[];
      stop_reason?: string;
    };
    return data.content[0]?.text ?? "";
  },
};

const openaiClient: ProviderClient = {
  async chat(apiKey, model, messages) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new AIProviderError(res.status, "openai", text);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message.content ?? "";
  },
};

const ollamaClient: ProviderClient = {
  async chat(_apiKey, model, messages, baseUrl) {
    const url = `${baseUrl ?? "http://localhost:11434"}/api/chat`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new AIProviderError(res.status, "ollama", text);
    }

    const data = (await res.json()) as { message: { content: string } };
    return data.message.content;
  },
};

const openrouterClient: ProviderClient = {
  async chat(apiKey, model, messages) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://blocksite.app",
        "X-Title": "BlockSite",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new AIProviderError(res.status, "openrouter", text);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message.content ?? "";
  },
};

const deepseekClient: ProviderClient = {
  async chat(apiKey, model, messages) {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new AIProviderError(res.status, "deepseek", text);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message.content ?? "";
  },
};

const CLIENTS: Record<AIProvider, ProviderClient> = {
  anthropic: anthropicClient,
  openai: openaiClient,
  ollama: ollamaClient,
  openrouter: openrouterClient,
  deepseek: deepseekClient,
};

export async function callAI(
  provider: AIProvider,
  model: string,
  messages: ChatMessage[],
  feature = "unknown",
): Promise<string> {
  const record = await apiKeys.get(provider);
  if (record === undefined || !record.key) {
    await logCall({
      provider,
      feature,
      input: messages.at(-1)?.content ?? "",
      output: "Missing API key",
      success: false,
    });
    throw new MissingApiKeyError(provider);
  }

  const client = CLIENTS[provider];
  if (client === undefined) {
    throw new Error(`Unknown AI provider: ${provider}`);
  }

  try {
    const result = await client.chat(record.key, record.model ?? model, messages, record.baseUrl);
    await logCall({
      provider,
      feature,
      input: messages.at(-1)?.content?.slice(0, 100) ?? "",
      output: result.slice(0, 200),
      success: true,
    });
    return result;
  } catch (err) {
    await logCall({
      provider,
      feature,
      input: messages.at(-1)?.content?.slice(0, 100) ?? "",
      output: err instanceof Error ? err.message : "Unknown error",
      success: false,
    });
    throw err;
  }
}

async function logCall(entry: {
  provider: AIProvider;
  feature: string;
  input: string;
  output: string;
  success: boolean;
}): Promise<void> {
  try {
    const logs = ((await settings.get("aiCallLogs")) as AICallLog[]) ?? [];
    logs.push({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      ...entry,
    });
    // Keep last 200 entries
    if (logs.length > 200) {
      logs.splice(0, logs.length - 200);
    }
    await settings.set("aiCallLogs", logs);
  } catch {
    /* logging is best-effort */
  }
}
