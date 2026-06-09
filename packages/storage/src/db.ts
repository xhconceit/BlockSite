import Dexie from "dexie";
import type {
  BlockedItem,
  Category,
  ScheduleConfig,
  UnlockState,
  BlockStatsRecord,
  DailyStats,
  QuoteItem,
} from "@blocksite/core";
import { STORAGE_DB_NAME } from "@blocksite/core";

export interface BlockSiteDB extends Dexie {
  rules: Dexie.Table<BlockedItem, string>;
  presets: Dexie.Table<{ category: Category; sites: string[]; quotes: QuoteItem[] }, Category>;
  schedule: Dexie.Table<ScheduleConfig, string>;
  auth: Dexie.Table<{ category: Category; hash: string }, Category>;
  unlockState: Dexie.Table<UnlockState, Category>;
  stats: Dexie.Table<BlockStatsRecord, string>;
  dailyStats: Dexie.Table<DailyStats, string>;
  settings: Dexie.Table<{ key: string; value: unknown }, string>;
}

export function openDB(): Promise<BlockSiteDB> {
  const db = new Dexie(STORAGE_DB_NAME) as BlockSiteDB;

  db.version(1).stores({
    rules: "id, category, type, enabled, order",
    presets: "category",
    schedule: "id",
    auth: "category",
    unlockState: "category",
    stats: "id, ruleId, category, timestamp",
    dailyStats: "date",
    settings: "key",
  });

  return db.open().then(() => db);
}
