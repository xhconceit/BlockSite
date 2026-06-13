import type {
  BlockedItem,
  Category,
  ScheduleConfig,
  UnlockState,
  BlockStatsRecord,
  DailyStats,
  QuoteItem,
} from "@blocksite/core";
import { DEFAULT_APP_CONFIG } from "@blocksite/core";
import type { BlockSiteDB, ApiKeyRecord } from "./db";

// ── Rules Store ──
export const rulesStore = {
  async getAll(db: BlockSiteDB): Promise<BlockedItem[]> {
    return db.rules.orderBy("order").toArray();
  },

  async getById(db: BlockSiteDB, id: string): Promise<BlockedItem | undefined> {
    return db.rules.get(id);
  },

  async put(db: BlockSiteDB, item: BlockedItem): Promise<string> {
    await db.rules.put(item);
    return item.id;
  },

  async delete(db: BlockSiteDB, id: string): Promise<void> {
    await db.rules.delete(id);
  },

  async bulkDelete(db: BlockSiteDB, ids: string[]): Promise<void> {
    await db.rules.bulkDelete(ids);
  },

  async bulkUpdate(db: BlockSiteDB, items: BlockedItem[]): Promise<void> {
    await db.rules.bulkPut(items);
  },
};

// ── Presets Store ──
export const presetsStore = {
  async getSites(db: BlockSiteDB, category: Category): Promise<string[]> {
    const record = await db.presets.get(category);
    return record?.sites ?? [];
  },

  async setSites(db: BlockSiteDB, category: Category, sites: string[]): Promise<void> {
    const existingPreset = await db.presets.get(category);
    await db.presets.put({ category, quotes: [], ...existingPreset, sites });
  },

  async getAllQuotes(db: BlockSiteDB): Promise<Record<Category, QuoteItem[]>> {
    const all = await db.presets.toArray();
    const result = {} as Record<Category, QuoteItem[]>;
    for (const item of all) {
      result[item.category] = item.quotes;
    }
    return result;
  },

  async getQuotes(db: BlockSiteDB, category: Category): Promise<QuoteItem[]> {
    const record = await db.presets.get(category);
    return record?.quotes ?? [];
  },

  async setQuotes(db: BlockSiteDB, category: Category, quotes: QuoteItem[]): Promise<void> {
    const existing = await db.presets.get(category);
    await db.presets.put({ category, sites: existing?.sites ?? [], ...existing, quotes });
  },
};

// ── Schedule Store ──
export const scheduleStore = {
  async get(db: BlockSiteDB): Promise<ScheduleConfig> {
    const record = await db.schedule.get("main");
    return (
      record ?? {
        enabled: false,
        periods: [],
        pomodoro: { enabled: false, workMinutes: 25, breakMinutes: 5, cycles: 4 },
        exclusions: [],
      }
    );
  },

  async put(db: BlockSiteDB, config: ScheduleConfig): Promise<void> {
    await db.schedule.put({ ...config, id: "main" } as ScheduleConfig & { id: string });
  },
};

// ── Auth Store ──
export const authStore = {
  async getHash(db: BlockSiteDB, category: Category): Promise<string | undefined> {
    const record = await db.auth.get(category);
    return record?.hash;
  },

  async setHash(db: BlockSiteDB, category: Category, hash: string): Promise<void> {
    await db.auth.put({ category, hash });
  },

  async removeHash(db: BlockSiteDB, category: Category): Promise<void> {
    await db.auth.delete(category);
  },
};

// ── Unlock State Store ──
export const unlockStateStore = {
  async get(db: BlockSiteDB, category: Category): Promise<UnlockState | undefined> {
    return db.unlockState.get(category);
  },

  async getAll(db: BlockSiteDB): Promise<UnlockState[]> {
    return db.unlockState.toArray();
  },

  async put(db: BlockSiteDB, state: UnlockState): Promise<void> {
    await db.unlockState.put(state);
  },
};

// ── Stats Store ──
export const statsStore = {
  async addRecord(db: BlockSiteDB, record: BlockStatsRecord): Promise<void> {
    await db.stats.add(record);
  },

  async getRecords(db: BlockSiteDB, from: number, to: number): Promise<BlockStatsRecord[]> {
    return db.stats.where("timestamp").between(from, to, true, true).toArray();
  },
};

// ── Daily Stats Store ──
export const dailyStatsStore = {
  async get(db: BlockSiteDB, date: string): Promise<DailyStats | undefined> {
    return db.dailyStats.get(date);
  },

  async getRange(db: BlockSiteDB, from: string, to: string): Promise<DailyStats[]> {
    return db.dailyStats.where("date").between(from, to, true, true).toArray();
  },

  async put(db: BlockSiteDB, stats: DailyStats): Promise<void> {
    await db.dailyStats.put(stats);
  },
};

// ── Settings Store ──
export const settingsStore = {
  async get(db: BlockSiteDB, key: string): Promise<unknown> {
    const record = await db.settings.get(key);
    if (key === "config" && record === undefined) {
      return DEFAULT_APP_CONFIG;
    }
    return record?.value;
  },

  async set(db: BlockSiteDB, key: string, value: unknown): Promise<void> {
    await db.settings.put({ key, value });
  },

  async remove(db: BlockSiteDB, key: string): Promise<void> {
    await db.settings.delete(key);
  },
};

// ── API Keys Store ──
export const apiKeysStore = {
  async get(db: BlockSiteDB, provider: string): Promise<ApiKeyRecord | undefined> {
    return db.apiKeys.get(provider);
  },

  async getAll(db: BlockSiteDB): Promise<ApiKeyRecord[]> {
    return db.apiKeys.toArray();
  },

  async put(db: BlockSiteDB, record: ApiKeyRecord): Promise<void> {
    await db.apiKeys.put(record);
  },

  async remove(db: BlockSiteDB, provider: string): Promise<void> {
    await db.apiKeys.delete(provider);
  },
};
