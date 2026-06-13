import type { Category } from "@blocksite/core";
import { stats } from "@blocksite/storage";
import { AIParseError } from "./types";
import { callAI } from "./providers";
import { generateQuotePrompt } from "./prompts";
import { getAIConfig } from "./shared";

export async function generateQuote(category: Category): Promise<{ text: string; author: string }> {
  const config = await getAIConfig();

  const today = new Date().toISOString().slice(0, 10);
  const daily = await stats.getDailyStats(today);
  const blockCount = daily?.byCategory?.[category] ?? 0;

  const { system, user } = generateQuotePrompt(category, blockCount);

  const text = await callAI(
    config.provider,
    config.model,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    "generate-quote",
  );

  try {
    const parsed = JSON.parse(text) as { text: string; author: string };
    return {
      text: String(parsed.text ?? ""),
      author: String(parsed.author ?? ""),
    };
  } catch {
    throw new AIParseError("generate-quote", `Invalid JSON: ${text.slice(0, 200)}`);
  }
}
