import type { DailyStats } from "@blocksite/core";
import { stats, rules as rulesRepo } from "@blocksite/storage";
import type { StatsInsight, StatsAnalysis } from "./types";
import { AIParseError } from "./types";
import { callAI } from "./providers";
import { analyzeStatsPrompt } from "./prompts";
import { getAIConfig } from "./shared";

export async function analyzeStats(from: string, to: string): Promise<StatsAnalysis> {
  const config = await getAIConfig();
  const [dailyStatsData, rules] = await Promise.all([
    stats.getAllDailyStats(from, to),
    rulesRepo.getAll(),
  ]);

  if (dailyStatsData.length === 0) {
    return {
      insights: [],
      summary:
        "No blocking data available for this period. Start using BlockSite to get AI-powered insights!",
    };
  }

  const validStats: DailyStats[] = dailyStatsData.filter(
    (d): d is DailyStats => d !== undefined && d !== null,
  );

  const { system, user } = analyzeStatsPrompt(validStats, rules);

  const text = await callAI(
    config.provider,
    config.model,
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    "analyze-stats",
  );

  try {
    const parsed = JSON.parse(text) as {
      insights: StatsInsight[];
      summary: string;
    };

    const insights: StatsInsight[] = (parsed.insights ?? [])
      .map((i) => ({
        title: String(i.title ?? ""),
        description: String(i.description ?? ""),
        severity: (["info", "warning", "suggestion"].includes(i.severity)
          ? i.severity
          : "info") as StatsInsight["severity"],
        actionable: Boolean(i.actionable),
      }))
      .filter((i) => i.title.length > 0);

    return {
      insights,
      summary: String(parsed.summary ?? ""),
    };
  } catch {
    throw new AIParseError("analyze-stats", `Invalid JSON: ${text.slice(0, 200)}`);
  }
}
