import { describe, it, expect, beforeEach } from "vitest";
import type { BlockedItem, Category, DailyStats } from "@blocksite/core";
import Dexie from "dexie";
import type { BlockSiteDB } from "../src/db";

function createTestDB(): BlockSiteDB {
  const db = new Dexie("blocksite-test") as BlockSiteDB;
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
  return db;
}

async function withDB<T>(fn: (db: BlockSiteDB) => Promise<T>): Promise<T> {
  const db = createTestDB();
  try {
    return await fn(db);
  } finally {
    db.close();
    await Dexie.delete("blocksite-test");
  }
}

const makeRule = (overrides: Partial<BlockedItem> = {}): BlockedItem => ({
  id: "rule-1",
  type: "domain",
  value: "example.com",
  enabled: true,
  category: "custom" as Category,
  customMessage: "",
  order: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe("rulesStore", () => {
  beforeEach(async () => {
    await Dexie.delete("blocksite-test");
  });

  it("getAll returns empty array when no rules exist", async () => {
    await withDB(async (db) => {
      const { rulesStore } = await import("../src/stores");
      const items = await rulesStore.getAll(db);
      expect(items).toEqual([]);
    });
  });

  it("put and getById roundtrip", async () => {
    await withDB(async (db) => {
      const { rulesStore } = await import("../src/stores");
      const rule = makeRule();
      await rulesStore.put(db, rule);
      const result = await rulesStore.getById(db, rule.id);
      expect(result).toEqual(rule);
    });
  });

  it("getAll returns rules ordered by order field", async () => {
    await withDB(async (db) => {
      const { rulesStore } = await import("../src/stores");
      await rulesStore.put(db, makeRule({ id: "a", order: 2, value: "a.com" }));
      await rulesStore.put(db, makeRule({ id: "b", order: 0, value: "b.com" }));
      await rulesStore.put(db, makeRule({ id: "c", order: 1, value: "c.com" }));
      const items = await rulesStore.getAll(db);
      expect(items[0]?.id).toBe("b");
      expect(items[1]?.id).toBe("c");
      expect(items[2]?.id).toBe("a");
    });
  });

  it("delete removes a rule", async () => {
    await withDB(async (db) => {
      const { rulesStore } = await import("../src/stores");
      const rule = makeRule();
      await rulesStore.put(db, rule);
      await rulesStore.delete(db, rule.id);
      const result = await rulesStore.getById(db, rule.id);
      expect(result).toBeUndefined();
    });
  });

  it("bulkDelete removes multiple rules", async () => {
    await withDB(async (db) => {
      const { rulesStore } = await import("../src/stores");
      await rulesStore.put(db, makeRule({ id: "a" }));
      await rulesStore.put(db, makeRule({ id: "b" }));
      await rulesStore.put(db, makeRule({ id: "c" }));
      await rulesStore.bulkDelete(db, ["a", "c"]);
      const items = await rulesStore.getAll(db);
      expect(items).toHaveLength(1);
      expect(items[0]?.id).toBe("b");
    });
  });

  it("bulkUpdate replaces multiple rules", async () => {
    await withDB(async (db) => {
      const { rulesStore } = await import("../src/stores");
      const r1 = makeRule({ id: "a", value: "old.com" });
      await rulesStore.put(db, r1);
      const updated = makeRule({ id: "a", value: "new.com" });
      await rulesStore.bulkUpdate(db, [updated]);
      const result = await rulesStore.getById(db, "a");
      expect(result?.value).toBe("new.com");
    });
  });
});

describe("presetsStore", () => {
  it("getSites returns empty array for new category", async () => {
    await withDB(async (db) => {
      const { presetsStore } = await import("../src/stores");
      const sites = await presetsStore.getSites(db, "social");
      expect(sites).toEqual([]);
    });
  });

  it("setSites and getSites roundtrip", async () => {
    await withDB(async (db) => {
      const { presetsStore } = await import("../src/stores");
      const sites = ["facebook.com", "twitter.com"];
      await presetsStore.setSites(db, "social", sites);
      const result = await presetsStore.getSites(db, "social");
      expect(result).toEqual(sites);
    });
  });

  it("getQuotes returns empty array for new category", async () => {
    await withDB(async (db) => {
      const { presetsStore } = await import("../src/stores");
      const quotes = await presetsStore.getQuotes(db, "game");
      expect(quotes).toEqual([]);
    });
  });

  it("setQuotes and getQuotes roundtrip", async () => {
    await withDB(async (db) => {
      const { presetsStore } = await import("../src/stores");
      const quotes = [{ id: "q1", text: "Test quote", author: "Me" }];
      await presetsStore.setQuotes(db, "game", quotes);
      const result = await presetsStore.getQuotes(db, "game");
      expect(result).toEqual(quotes);
    });
  });
});

describe("authStore", () => {
  it("getHash returns undefined for new category", async () => {
    await withDB(async (db) => {
      const { authStore } = await import("../src/stores");
      const hash = await authStore.getHash(db, "social");
      expect(hash).toBeUndefined();
    });
  });

  it("setHash and getHash roundtrip", async () => {
    await withDB(async (db) => {
      const { authStore } = await import("../src/stores");
      await authStore.setHash(db, "social", "abc123hash");
      const hash = await authStore.getHash(db, "social");
      expect(hash).toBe("abc123hash");
    });
  });

  it("removeHash clears the hash", async () => {
    await withDB(async (db) => {
      const { authStore } = await import("../src/stores");
      await authStore.setHash(db, "social", "abc123hash");
      await authStore.removeHash(db, "social");
      const hash = await authStore.getHash(db, "social");
      expect(hash).toBeUndefined();
    });
  });
});

describe("dailyStatsStore", () => {
  it("get returns undefined for new date", async () => {
    await withDB(async (db) => {
      const { dailyStatsStore } = await import("../src/stores");
      const stats = await dailyStatsStore.get(db, "2026-01-01");
      expect(stats).toBeUndefined();
    });
  });

  it("put and get roundtrip", async () => {
    await withDB(async (db) => {
      const { dailyStatsStore } = await import("../src/stores");
      const ds: DailyStats = {
        date: "2026-01-01",
        totalBlocks: 10,
        byCategory: { social: 5, video: 3, game: 2, news: 0, adult: 0, custom: 0 },
        byRule: { "rule-1": 10 },
        byHour: { 9: 5, 14: 5 },
      };
      await dailyStatsStore.put(db, ds);
      const result = await dailyStatsStore.get(db, "2026-01-01");
      expect(result).toEqual(ds);
    });
  });

  it("getRange returns dates within range", async () => {
    await withDB(async (db) => {
      const { dailyStatsStore } = await import("../src/stores");
      const base = (date: string): DailyStats => ({
        date,
        totalBlocks: 1,
        byCategory: { social: 1, video: 0, game: 0, news: 0, adult: 0, custom: 0 },
        byRule: {},
        byHour: {},
      });
      await dailyStatsStore.put(db, base("2026-01-01"));
      await dailyStatsStore.put(db, base("2026-01-05"));
      await dailyStatsStore.put(db, base("2026-01-10"));
      const results = await dailyStatsStore.getRange(db, "2026-01-02", "2026-01-08");
      expect(results).toHaveLength(1);
      expect(results[0]?.date).toBe("2026-01-05");
    });
  });
});

describe("settingsStore", () => {
  it("get returns default config for config key when not set", async () => {
    await withDB(async (db) => {
      const { settingsStore } = await import("../src/stores");
      const config = await settingsStore.get(db, "config");
      expect(config).toBeDefined();
      expect((config as { enabled: boolean }).enabled).toBe(true);
    });
  });

  it("set and get roundtrip", async () => {
    await withDB(async (db) => {
      const { settingsStore } = await import("../src/stores");
      await settingsStore.set(db, "test-key", { foo: "bar" });
      const value = await settingsStore.get(db, "test-key");
      expect(value).toEqual({ foo: "bar" });
    });
  });

  it("remove clears the value", async () => {
    await withDB(async (db) => {
      const { settingsStore } = await import("../src/stores");
      await settingsStore.set(db, "test-key", "value");
      await settingsStore.remove(db, "test-key");
      const value = await settingsStore.get(db, "test-key");
      expect(value).toBeUndefined();
    });
  });
});
