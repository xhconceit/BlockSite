import type { Category, BlockStatsRecord, DailyStats } from "@blocksite/core";
import { CATEGORIES } from "@blocksite/core";
import { stats as statsRepo } from "@blocksite/storage";
import { emitter } from "@blocksite/event-bus";

export async function recordBlock(ruleId: string, category: Category, url: string): Promise<void> {
  const record: BlockStatsRecord = {
    id: crypto.randomUUID(),
    ruleId,
    category,
    url,
    timestamp: Date.now(),
  };

  await statsRepo.addRecord(record);

  // Update daily stats
  const today = formatDate(new Date());
  const existing = await statsRepo.getDailyStats(today);
  const daily: DailyStats = existing ?? emptyDailyStats(today);

  daily.totalBlocks++;
  daily.byCategory[category] = (daily.byCategory[category] ?? 0) + 1;
  daily.byRule[ruleId] = (daily.byRule[ruleId] ?? 0) + 1;

  const hour = new Date().getHours();
  daily.byHour[hour] = (daily.byHour[hour] ?? 0) + 1;

  await statsRepo.upsertDailyStats(daily);
  emitter.emit("block:recorded", { ruleId, category, url });
}

function emptyDailyStats(date: string): DailyStats {
  const byCategory = {} as Record<Category, number>;
  for (const cat of CATEGORIES) {
    byCategory[cat] = 0;
  }
  return {
    date,
    totalBlocks: 0,
    byCategory,
    byRule: {},
    byHour: {},
  };
}

export async function getCategoryBreakdown(
  from: string,
  to: string,
): Promise<Record<Category, number>> {
  const records = await statsRepo.getAllDailyStats(from, to);
  const result = {} as Record<Category, number>;
  for (const cat of CATEGORIES) {
    result[cat] = 0;
  }
  for (const record of records) {
    for (const cat of CATEGORIES) {
      result[cat] += record.byCategory[cat] ?? 0;
    }
  }
  const total = Object.values(result).reduce((sum, v) => sum + v, 0);
  if (total > 0) {
    for (const cat of CATEGORIES) {
      result[cat] = Math.round((result[cat] / total) * 100);
    }
  }
  return result;
}

export async function getHourlyBreakdown(
  from: string,
  to: string,
): Promise<Record<number, number>> {
  const records = await statsRepo.getAllDailyStats(from, to);
  const result: Record<number, number> = {};
  for (let h = 0; h < 24; h++) {
    result[h] = 0;
  }
  for (const record of records) {
    for (const [hour, count] of Object.entries(record.byHour)) {
      result[parseInt(hour, 10)] = (result[parseInt(hour, 10)] ?? 0) + (count ?? 0);
    }
  }
  return result;
}

export async function getRuleRanking(
  from: string,
  to: string,
  limit = 10,
): Promise<{ ruleId: string; count: number }[]> {
  const records = await statsRepo.getAllDailyStats(from, to);
  const ruleCounts: Record<string, number> = {};
  for (const record of records) {
    for (const [ruleId, count] of Object.entries(record.byRule)) {
      ruleCounts[ruleId] = (ruleCounts[ruleId] ?? 0) + (count ?? 0);
    }
  }
  return Object.entries(ruleCounts)
    .map(([ruleId, count]) => ({ ruleId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getTrendComparison(
  currentFrom: string,
  currentTo: string,
  previousFrom: string,
  previousTo: string,
): Promise<{ current: DailyStats[]; previous: DailyStats[]; changePercent: number }> {
  const current = await statsRepo.getAllDailyStats(currentFrom, currentTo);
  const previous = await statsRepo.getAllDailyStats(previousFrom, previousTo);

  const currentTotal = current.reduce((s, r) => s + r.totalBlocks, 0);
  const previousTotal = previous.reduce((s, r) => s + r.totalBlocks, 0);

  const changePercent =
    previousTotal > 0 ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100) : 0;

  return { current, previous, changePercent };
}

export async function getTodayCount(): Promise<number> {
  const today = formatDate(new Date());
  const stats = await statsRepo.getDailyStats(today);
  return stats?.totalBlocks ?? 0;
}

export async function getTotalCount(): Promise<number> {
  const all = await statsRepo.getAllDailyStats("2000-01-01", "2099-12-31");
  return all.reduce((sum, r) => sum + r.totalBlocks, 0);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
