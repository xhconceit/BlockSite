import type { Category } from "@blocksite/core";
import { AIParseError } from "./types";
import { callAI } from "./providers";
import { classifyUrlPrompt } from "./prompts";
import { getAIConfig } from "./shared";

export interface ClassifyResult {
  blocked: boolean;
  matchedIntent: string;
  category: Category;
  reason: string;
}

export async function classifyUrl(
  url: string,
  title: string,
  descriptions: string[],
  content?: string,
): Promise<ClassifyResult> {
  const config = await getAIConfig();
  const { system, user } = classifyUrlPrompt(url, title, descriptions, content);

  const text = await callAI(
    config.provider,
    config.model,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    "classify-url",
  );

  try {
    const parsed = JSON.parse(text) as {
      blocked: boolean;
      matchedIntent: string;
      category: string;
      reason: string;
    };
    const validCategories: Category[] = [
      "social",
      "video",
      "game",
      "news",
      "shopping",
      "adult",
      "custom",
    ];
    return {
      blocked: Boolean(parsed.blocked),
      matchedIntent: String(parsed.matchedIntent ?? ""),
      category: (validCategories.includes(parsed.category as Category)
        ? parsed.category
        : "custom") as Category,
      reason: String(parsed.reason ?? ""),
    };
  } catch {
    throw new AIParseError("classify-url", `Invalid JSON: ${text.slice(0, 200)}`);
  }
}
