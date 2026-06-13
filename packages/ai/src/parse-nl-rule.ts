import { CATEGORIES } from "@blocksite/core";
import type { Category } from "@blocksite/core";
import { rules as rulesRepo } from "@blocksite/storage";
import type { NLParsedRules, ParsedRule } from "./types";
import { AIParseError } from "./types";
import { callAI } from "./providers";
import { parseNLRulePrompt } from "./prompts";
import { getAIConfig } from "./shared";

export async function parseNaturalLanguageRule(nlInput: string): Promise<NLParsedRules> {
  const config = await getAIConfig();
  const existingRules = await rulesRepo.getAll();

  const { system, user } = parseNLRulePrompt(nlInput, existingRules);

  const text = await callAI(
    config.provider,
    config.model,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    "parse-nl-rule",
  );

  try {
    const parsed = JSON.parse(text) as {
      rules: ParsedRule[];
      explanation: string;
    };

    const validatedRules: ParsedRule[] = (parsed.rules ?? [])
      .filter((r) => r.type === "domain" || r.type === "keyword")
      .map((r) => ({
        type: r.type,
        value: String(r.value ?? "")
          .replace(/^(https?:\/\/)?(www\.)?/, "")
          .replace(/\/$/, ""),
        category: (CATEGORIES.includes(r.category as Category) ? r.category : "custom") as Category,
        enabled: r.enabled !== false,
      }))
      .filter((r) => r.value.length > 0);

    return {
      rules: validatedRules,
      explanation: String(parsed.explanation ?? ""),
    };
  } catch {
    throw new AIParseError("parse-nl-rule", `Invalid JSON: ${text.slice(0, 200)}`);
  }
}
