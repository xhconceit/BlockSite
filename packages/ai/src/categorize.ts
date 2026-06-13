import { CATEGORIES } from "@blocksite/core";
import type { Category } from "@blocksite/core";
import type { CategorizationResult } from "./types";
import { AIParseError } from "./types";
import { callAI } from "./providers";
import { categorizeSitePrompt } from "./prompts";
import { getAIConfig } from "./shared";

export async function categorizeSite(siteUrl: string): Promise<CategorizationResult> {
  const config = await getAIConfig();
  const { system, user } = categorizeSitePrompt(siteUrl);

  const text = await callAI(
    config.provider,
    config.model,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    "categorize",
  );

  try {
    const parsed = JSON.parse(text) as {
      category: string;
      confidence: number;
      reasoning: string;
    };
    const category = (
      CATEGORIES.includes(parsed.category as Category) ? parsed.category : "custom"
    ) as Category;
    return {
      category,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      reasoning: String(parsed.reasoning ?? ""),
    };
  } catch {
    throw new AIParseError("categorize", `Invalid JSON: ${text.slice(0, 200)}`);
  }
}
