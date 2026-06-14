import type {
  BlockedItem,
  ScheduleConfig,
  UnlockState,
  BlockStatsRecord,
  DailyStats,
  QuoteItem,
  Category,
} from "@blocksite/core";
import { DEFAULT_APP_CONFIG } from "@blocksite/core";
import { openDB } from "./db";
import type { BlockSiteDB, ApiKeyRecord } from "./db";
import {
  rulesStore,
  presetsStore,
  scheduleStore,
  authStore,
  unlockStateStore,
  statsStore,
  dailyStatsStore,
  settingsStore,
  apiKeysStore,
} from "./stores";

let db: BlockSiteDB | null = null;
let fallbackMode = false;

export async function initStorage(): Promise<boolean> {
  try {
    db = await openDB();
    fallbackMode = false;
    console.log("[BlockSite] IndexedDB initialized");
    return true;
  } catch (err) {
    console.warn("[BlockSite] IndexedDB unavailable, using chrome.storage.local fallback", err);
    fallbackMode = true;
    return false;
  }
}

export function isIndexedDBAvailable(): boolean {
  return !fallbackMode && db !== null;
}

function getDB(): BlockSiteDB {
  if (db === null && !fallbackMode) {
    throw new Error("Storage not initialized. Call initStorage() first.");
  }
  return db!;
}

// ── Chrome Storage Fallback ──
const FALLBACK_KEY = "blocksite_config";

async function loadFallback(): Promise<Record<string, unknown>> {
  const result = await chrome.storage.local.get(FALLBACK_KEY);
  return (result[FALLBACK_KEY] as Record<string, unknown>) ?? {};
}

async function saveFallback(data: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set({ [FALLBACK_KEY]: data });
}

// ── Rules ──
export const rules = {
  async getAll(): Promise<BlockedItem[]> {
    if (fallbackMode) {
      const fb = await loadFallback();
      return (fb["rules"] as BlockedItem[]) ?? [];
    }
    return rulesStore.getAll(getDB());
  },
  async getById(id: string): Promise<BlockedItem | undefined> {
    if (fallbackMode) {
      const all = await rules.getAll();
      return all.find((r) => r.id === id);
    }
    return rulesStore.getById(getDB(), id);
  },
  async put(item: BlockedItem): Promise<string> {
    if (fallbackMode) {
      const all = await rules.getAll();
      const idx = all.findIndex((r) => r.id === item.id);
      if (idx >= 0) all[idx] = item;
      else all.push(item);
      const fb = await loadFallback();
      fb["rules"] = all;
      await saveFallback(fb);
      return item.id;
    }
    return rulesStore.put(getDB(), item);
  },
  async delete(id: string): Promise<void> {
    if (fallbackMode) {
      const all = await rules.getAll();
      const fb = await loadFallback();
      fb["rules"] = all.filter((r) => r.id !== id);
      await saveFallback(fb);
      return;
    }
    return rulesStore.delete(getDB(), id);
  },
  async bulkDelete(ids: string[]): Promise<void> {
    if (fallbackMode) {
      const all = await rules.getAll();
      const fb = await loadFallback();
      fb["rules"] = all.filter((r) => !ids.includes(r.id));
      await saveFallback(fb);
      return;
    }
    return rulesStore.bulkDelete(getDB(), ids);
  },
  async bulkUpdate(items: BlockedItem[]): Promise<void> {
    if (fallbackMode) {
      const all = await rules.getAll();
      for (const item of items) {
        const idx = all.findIndex((r) => r.id === item.id);
        if (idx >= 0) all[idx] = item;
        else all.push(item);
      }
      const fb = await loadFallback();
      fb["rules"] = all;
      await saveFallback(fb);
      return;
    }
    return rulesStore.bulkUpdate(getDB(), items);
  },
};

// ── Presets ──
export const presets = {
  async getSites(category: Category): Promise<string[]> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const p = (fb["presets"] as Record<string, { sites: string[] }>) ?? {};
      return p[category]?.sites ?? [];
    }
    return presetsStore.getSites(getDB(), category);
  },
  async setSites(category: Category, sites: string[]): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const p =
        (fb["presets"] as Record<
          string,
          { sites: string[]; quotes: QuoteItem[]; goal?: string }
        >) ?? {};
      const existing = p[category];
      p[category] = {
        sites,
        quotes: existing?.quotes ?? [],
        ...(existing?.goal !== undefined ? { goal: existing.goal } : {}),
      };
      fb["presets"] = p;
      await saveFallback(fb);
      return;
    }
    return presetsStore.setSites(getDB(), category, sites);
  },
  async getQuotes(category: Category): Promise<QuoteItem[]> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const p = (fb["presets"] as Record<string, { quotes: QuoteItem[] }>) ?? {};
      return p[category]?.quotes ?? [];
    }
    return presetsStore.getQuotes(getDB(), category);
  },
  async setQuotes(category: Category, quotes: QuoteItem[]): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const p =
        (fb["presets"] as Record<
          string,
          { sites: string[]; quotes: QuoteItem[]; goal?: string }
        >) ?? {};
      const existing = p[category];
      p[category] = {
        sites: existing?.sites ?? [],
        quotes,
        ...(existing?.goal !== undefined ? { goal: existing.goal } : {}),
      };
      fb["presets"] = p;
      await saveFallback(fb);
      return;
    }
    return presetsStore.setQuotes(getDB(), category, quotes);
  },
  async getGoal(category: Category): Promise<string | undefined> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const p = (fb["presets"] as Record<string, { goal?: string }>) ?? {};
      return p[category]?.goal;
    }
    return presetsStore.getGoal(getDB(), category);
  },
  async setGoal(category: Category, goal: string): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const p =
        (fb["presets"] as Record<
          string,
          { sites: string[]; quotes: QuoteItem[]; goal?: string }
        >) ?? {};
      p[category] = { sites: p[category]?.sites ?? [], quotes: p[category]?.quotes ?? [], goal };
      fb["presets"] = p;
      await saveFallback(fb);
      return;
    }
    return presetsStore.setGoal(getDB(), category, goal);
  },
};

// ── Schedule ──
export const schedule = {
  async get(): Promise<ScheduleConfig> {
    if (fallbackMode) {
      const fb = await loadFallback();
      return (
        (fb["schedule"] as ScheduleConfig) ?? {
          enabled: false,
          periods: [],
          pomodoro: { enabled: false, workMinutes: 25, breakMinutes: 5, cycles: 4 },
          exclusions: [],
        }
      );
    }
    return scheduleStore.get(getDB());
  },
  async put(config: ScheduleConfig): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      fb["schedule"] = config;
      await saveFallback(fb);
      return;
    }
    return scheduleStore.put(getDB(), config);
  },
};

// ── Auth ──
export const auth = {
  async getHash(category: Category): Promise<string | undefined> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const a = (fb["auth"] as Record<string, string>) ?? {};
      return a[category];
    }
    return authStore.getHash(getDB(), category);
  },
  async setHash(category: Category, hash: string): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const a = (fb["auth"] as Record<string, string>) ?? {};
      a[category] = hash;
      fb["auth"] = a;
      await saveFallback(fb);
      return;
    }
    return authStore.setHash(getDB(), category, hash);
  },
  async removeHash(category: Category): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const a = (fb["auth"] as Record<string, string>) ?? {};
      delete a[category];
      fb["auth"] = a;
      await saveFallback(fb);
      return;
    }
    return authStore.removeHash(getDB(), category);
  },
};

// ── Unlock State ──
export const unlockState = {
  async get(category: Category): Promise<UnlockState | undefined> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const u = (fb["unlockState"] as Record<string, UnlockState>) ?? {};
      return u[category];
    }
    return unlockStateStore.get(getDB(), category);
  },
  async getAll(): Promise<UnlockState[]> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const u = (fb["unlockState"] as Record<string, UnlockState>) ?? {};
      return Object.values(u);
    }
    return unlockStateStore.getAll(getDB());
  },
  async put(state: UnlockState): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const u = (fb["unlockState"] as Record<string, UnlockState>) ?? {};
      u[state.category] = state;
      fb["unlockState"] = u;
      await saveFallback(fb);
      return;
    }
    return unlockStateStore.put(getDB(), state);
  },
};

// ── Stats ──
export const stats = {
  async addRecord(record: BlockStatsRecord): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const records = (fb["statsRecords"] as BlockStatsRecord[]) ?? [];
      records.push(record);
      fb["statsRecords"] = records;
      await saveFallback(fb);
      return;
    }
    return statsStore.addRecord(getDB(), record);
  },
  async getRecords(from: number, to: number): Promise<BlockStatsRecord[]> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const records = (fb["statsRecords"] as BlockStatsRecord[]) ?? [];
      return records.filter((r) => r.timestamp >= from && r.timestamp <= to);
    }
    return statsStore.getRecords(getDB(), from, to);
  },
  async getDailyStats(date: string): Promise<DailyStats | undefined> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const ds = (fb["dailyStats"] as Record<string, DailyStats>) ?? {};
      return ds[date];
    }
    return dailyStatsStore.get(getDB(), date);
  },
  async getAllDailyStats(from: string, to: string): Promise<DailyStats[]> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const ds = (fb["dailyStats"] as Record<string, DailyStats>) ?? {};
      return Object.values(ds).filter((d) => d.date >= from && d.date <= to);
    }
    return dailyStatsStore.getRange(getDB(), from, to);
  },
  async upsertDailyStats(stat: DailyStats): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const ds = (fb["dailyStats"] as Record<string, DailyStats>) ?? {};
      ds[stat.date] = stat;
      fb["dailyStats"] = ds;
      await saveFallback(fb);
      return;
    }
    return dailyStatsStore.put(getDB(), stat);
  },
};

// ── Settings ──
export const settings = {
  async get(key: string): Promise<unknown> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const s = (fb["settings"] as Record<string, unknown>) ?? {};
      if (key === "config" && s[key] === undefined) return DEFAULT_APP_CONFIG;
      return s[key];
    }
    return settingsStore.get(getDB(), key);
  },
  async set(key: string, value: unknown): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const s = (fb["settings"] as Record<string, unknown>) ?? {};
      s[key] = value;
      fb["settings"] = s;
      await saveFallback(fb);
      return;
    }
    return settingsStore.set(getDB(), key, value);
  },
  async remove(key: string): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const s = (fb["settings"] as Record<string, unknown>) ?? {};
      delete s[key];
      fb["settings"] = s;
      await saveFallback(fb);
      return;
    }
    return settingsStore.remove(getDB(), key);
  },
};

// ── API Keys ──
export const apiKeys = {
  async get(provider: string): Promise<ApiKeyRecord | undefined> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const a = (fb["apiKeys"] as Record<string, ApiKeyRecord>) ?? {};
      return a[provider];
    }
    return apiKeysStore.get(getDB(), provider);
  },
  async getAll(): Promise<ApiKeyRecord[]> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const a = (fb["apiKeys"] as Record<string, ApiKeyRecord>) ?? {};
      return Object.entries(a).map(([provider, record]) => ({ ...record, provider }));
    }
    return apiKeysStore.getAll(getDB());
  },
  async put(record: ApiKeyRecord): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const a = (fb["apiKeys"] as Record<string, ApiKeyRecord>) ?? {};
      a[record.provider] = record;
      fb["apiKeys"] = a;
      await saveFallback(fb);
      return;
    }
    return apiKeysStore.put(getDB(), record);
  },
  async remove(provider: string): Promise<void> {
    if (fallbackMode) {
      const fb = await loadFallback();
      const a = (fb["apiKeys"] as Record<string, unknown>) ?? {};
      delete a[provider];
      fb["apiKeys"] = a;
      await saveFallback(fb);
      return;
    }
    return apiKeysStore.remove(getDB(), provider);
  },
};
