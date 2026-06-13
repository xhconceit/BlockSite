import { initStorage, rules as rulesRepo, settings } from "../packages/storage/src";
import { applyRules, clearAllRules, getAll, createItem } from "../packages/rules/src";
import { getConfig, saveConfig, isActive } from "../packages/schedule/src";
import { checkExpiry, getRemainingUnlocks } from "../packages/unlock/src";
import { recordBlock } from "../packages/stats/src";
import { exportData, importData, validateImportData } from "../packages/import-export/src";
import {
  getAllCategoryInfo,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../packages/categories/src";
import type { Category, AppConfig, BlockedItem, CategoryInfo } from "../packages/core/src";
import { DEFAULT_APP_CONFIG } from "../packages/core/src";

const pendingBlockedUrls = new Map<number, string>();
const aiBlockCache = new Map<string, { blocked: boolean; category: string }>();
let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (initPromise === null) {
    initPromise = initialize();
  }
  return initPromise;
}

export default defineBackground(() => {
  initPromise = initialize().catch((err) => {
    console.error("[BlockSite] Init failed:", err);
    initPromise = null;
    throw err;
  });

  chrome.runtime.onInstalled.addListener(() => {
    ensureInitialized().catch(console.error);
  });

  chrome.runtime.onStartup.addListener(() => {
    ensureInitialized().catch(console.error);
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    ensureInitialized()
      .then(() => handleMessage(message as Record<string, unknown>, sender))
      .then(sendResponse)
      .catch((err: Error) => {
        sendResponse({ error: err.message });
      });
    return true;
  });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "schedule-check") {
      await handleScheduleTick();
    } else if (alarm.name === "auto-recover") {
      await handleAutoRecover();
    } else if (alarm.name.startsWith("unlock-")) {
      const category = alarm.name.replace("unlock-", "") as Category;
      await handleUnlockCheck(category);
    }
  });

  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.url.startsWith("chrome-extension://")) return;
    if (details.frameType === "outermost_frame" || details.frameId === 0) {
      pendingBlockedUrls.set(details.tabId, details.url);
    }
  });

  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.url.startsWith(chrome.runtime.getURL(""))) {
      return;
    }
    if (details.frameType === "outermost_frame" || details.frameId === 0) {
      pendingBlockedUrls.delete(details.tabId);
      handleSmartBlock(details.tabId, details.url).catch(() => {});
    }
  });
});

async function seedDefaultRules(): Promise<void> {
  const dbAvailable = await initStorage();
  console.log("[BlockSite] Checking default rules...", { dbAvailable });

  const existing = await rulesRepo.getAll();
  const existingValues = new Set(existing.map((r) => r.value));

  const defaultSites: { site: string; category: Category }[] = [
    // Social
    { site: "facebook.com", category: "social" },
    { site: "twitter.com", category: "social" },
    { site: "instagram.com", category: "social" },
    { site: "tiktok.com", category: "social" },
    // Video
    { site: "youtube.com", category: "video" },
    { site: "bilibili.com", category: "video" },
    { site: "netflix.com", category: "video" },
    // Game
    { site: "steampowered.com", category: "game" },
    { site: "twitch.tv", category: "game" },
    // News
    { site: "reddit.com", category: "news" },
    { site: "toutiao.com", category: "news" },
    // Adult
    { site: "pornhub.com", category: "adult" },
    { site: "xvideos.com", category: "adult" },
    { site: "xnxx.com", category: "adult" },
  ];

  let added = 0;
  const newSites = defaultSites.filter((ds) => !existingValues.has(ds.site));
  for (let i = 0; i < newSites.length; i++) {
    const ds = newSites[i]!;
    const item = createItem("domain", ds.site, ds.category, "", existing.length + i);
    await rulesRepo.put(item);
    added++;
  }

  if (added > 0) {
    console.log(`[BlockSite] Seeded ${added} new default rules`);
  } else {
    console.log("[BlockSite] All default rules already exist");
  }
}

async function initialize(): Promise<void> {
  const dbAvailable = await initStorage();
  console.log("[BlockSite] Initializing...", { dbAvailable });

  // Always ensure defaults exist (incremental, won't duplicate)
  await seedDefaultRules();
  const items = await rulesRepo.getAll();

  const config = await getAppConfig();
  console.log("[BlockSite] Config loaded:", config);
  await setupScheduleAlarms();

  if (config.enabled) {
    console.log(`[BlockSite] Applying ${items.length} rules...`);
    await applyRules(items);
    console.log("[BlockSite] Rules applied successfully");
  } else {
    await clearAllRules();
    console.log("[BlockSite] Blocking disabled, rules cleared");
  }
}

async function getAppConfig(): Promise<AppConfig> {
  const stored = (await settings.get("config")) as AppConfig | undefined;
  return stored ?? DEFAULT_APP_CONFIG;
}

async function setupScheduleAlarms(): Promise<void> {
  await chrome.alarms.clear("schedule-check");
  const sched = await getConfig();
  if (sched.enabled) {
    chrome.alarms.create("schedule-check", { periodInMinutes: 1 });
  }
}

async function handleScheduleTick(): Promise<void> {
  const sched = await getConfig();
  const nowIsActive = isActive(sched, Date.now());
  const config = await getAppConfig();

  if (nowIsActive && !config.enabled) {
    await settings.set("config", { ...config, enabled: true });
    const items = await rulesRepo.getAll();
    await applyRules(items);
  } else if (!nowIsActive && config.enabled) {
    await settings.set("config", { ...config, enabled: false });
    await clearAllRules();
  }
}

async function handleAutoRecover(): Promise<void> {
  const config = await getAppConfig();
  await settings.set("config", { ...config, enabled: true });
  const items = await rulesRepo.getAll();
  await applyRules(items);
}

async function handleUnlockCheck(category: Category): Promise<void> {
  const result = await checkExpiry(category);
  if (!result.active) {
    const config = await getAppConfig();
    if (config.enabled) {
      const items = await rulesRepo.getAll();
      await applyRules(items);
    }
  }
}

async function handleSmartBlock(tabId: number, url: string): Promise<void> {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return;

  const rules =
    ((await settings.get("aiSmartRules")) as
      | { id: string; description: string; category: string; enabled: boolean }[]
      | undefined) ?? [];
  const active = rules.filter((r) => r.enabled);
  if (active.length === 0) return;

  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return;
  }

  // Check cache
  const cached = aiBlockCache.get(hostname);
  if (cached !== undefined) {
    if (cached.blocked) {
      await redirectToBlocked(tabId, url, cached.category, "");
    }
    return;
  }

  // Not cached — classify with AI
  try {
    // Get page title and content for better classification
    let title = "";
    let content = "";
    try {
      const tab = await chrome.tabs.get(tabId);
      title = tab.title ?? "";
      // Extract page text content
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.body?.innerText?.slice(0, 2000) ?? "",
      });
      content = (results[0]?.result as string) ?? "";
    } catch {
      /* tab might not be ready */
    }

    const activeDescriptions = active.map((r) => r.description);
    const { classifyUrl } = await import("../packages/ai/src");
    const result = await classifyUrl(url, title, activeDescriptions, content);

    // Cache result for 24h
    aiBlockCache.set(hostname, {
      blocked: result.blocked,
      category: result.category,
    });

    if (result.blocked) {
      // Add to DNR for instant future blocking
      const rulesList = await rulesRepo.getAll();
      const existing = rulesList.find((r) => r.type === "domain" && r.value === hostname);
      if (existing === undefined) {
        const item = createItem("domain", hostname, result.category, "", rulesList.length);
        await rulesRepo.put(item);
        const config = await getAppConfig();
        if (config.enabled) {
          const allRules = await rulesRepo.getAll();
          await applyRules(allRules);
        }
      }

      await redirectToBlocked(tabId, url, result.category, result.reason);
    }
  } catch {
    /* AI not configured or failed — allow navigation */
  }
}

async function redirectToBlocked(
  tabId: number,
  blockedUrl: string,
  category: string,
  reason: string,
): Promise<void> {
  const params = new URLSearchParams({
    ruleId: `ai-${Date.now()}`,
    category,
    customMessage: encodeURIComponent(reason || "AI blocked this site"),
  });
  const blockedPage = chrome.runtime.getURL(`blocked.html?${params.toString()}`);
  await chrome.tabs.update(tabId, { url: blockedPage }).catch(() => {});
}

type MsgHandler = (
  msg: Record<string, unknown>,
  sender: chrome.runtime.MessageSender,
) => Promise<unknown>;

async function handleMessage(
  message: Record<string, unknown>,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  const type = String(message["type"] ?? "");

  const handlers: Record<string, MsgHandler> = {
    getConfig: async () => {
      const config = await getAppConfig();
      const rules = await getAll();
      const scheduleConfig = await getConfig();
      const { getUnlockState } = await import("../packages/unlock/src");
      const unlockStates = await getUnlockState();
      const categories = await getAllCategoryInfo();
      return { config, rules, schedule: scheduleConfig, unlockStates, categories };
    },

    toggleEnabled: async (msg) => {
      const enabled = msg["enabled"] as boolean;
      const config = await getAppConfig();
      await settings.set("config", { ...config, enabled });

      if (enabled) {
        const items = await rulesRepo.getAll();
        await applyRules(items);
      } else {
        await clearAllRules();
      }

      if (!enabled && config.autoRecoverMinutes > 0) {
        chrome.alarms.create("auto-recover", { delayInMinutes: config.autoRecoverMinutes });
      }
      return { success: true };
    },

    setAutoRecover: async (msg) => {
      const minutes = msg["minutes"] as number;
      const config = await getAppConfig();
      await settings.set("config", { ...config, autoRecoverMinutes: minutes });
      return { success: true };
    },

    setLocale: async (msg) => {
      const locale = msg["locale"] as string;
      const config = await getAppConfig();
      await settings.set("config", { ...config, locale });
      return { success: true };
    },

    getCategories: async () => {
      return getAllCategoryInfo();
    },

    addCategory: async (msg) => {
      const info = msg["info"] as CategoryInfo;
      await addCategory(info);
      return { success: true };
    },

    updateCategory: async (msg) => {
      const key = msg["key"] as string;
      const info = msg["info"] as Partial<CategoryInfo>;
      await updateCategory(key, info);
      return { success: true };
    },

    deleteCategory: async (msg) => {
      const key = msg["key"] as string;
      await deleteCategory(key);
      return { success: true };
    },

    updateRules: async (msg) => {
      const items = msg["items"] as BlockedItem[];
      const config = await getAppConfig();
      if (config.enabled) {
        await applyRules(items);
      }
      return { success: true };
    },

    updateSchedule: async (msg) => {
      const sched = msg["schedule"] as Parameters<typeof saveConfig>[0];
      await saveConfig(sched);
      await setupScheduleAlarms();
      return { success: true };
    },

    unlock: async (msg) => {
      const category = msg["category"] as Category;
      const password = msg["password"] as string;
      const duration = msg["duration"] as number | undefined;
      const { unlock } = await import("../packages/unlock/src");
      const result = await unlock(category, password, duration);

      if (result.success) {
        await clearAllRules();
        chrome.alarms.create(`unlock-${category}`, { periodInMinutes: 1 });
      }
      return result;
    },

    setPassword: async (msg) => {
      const category = msg["category"] as Category;
      const pwd = msg["password"] as string;
      const { setCategoryPassword } = await import("../packages/auth/src");
      await setCategoryPassword(category, pwd);
      return { success: true };
    },

    extendUnlock: async (msg) => {
      const category = msg["category"] as Category;
      const password = msg["password"] as string;
      const additionalMinutes = msg["additionalMinutes"] as number | undefined;
      const { extendUnlock } = await import("../packages/unlock/src");
      return extendUnlock(category, password, additionalMinutes);
    },

    checkUnlock: async (msg) => {
      const category = msg["category"] as Category;
      const [expiry, remaining] = await Promise.all([
        checkExpiry(category),
        getRemainingUnlocks(category),
      ]);
      return { ...expiry, remainingUnlocks: remaining };
    },

    blockPageOpened: async (msg) => {
      const tabId = sender.tab?.id;
      const blockedUrl = tabId !== undefined ? pendingBlockedUrls.get(tabId) || "" : "";
      const ruleId = msg["ruleId"] as string;
      const category = msg["category"] as Category;
      if (ruleId && category) {
        await recordBlock(ruleId, category, blockedUrl);
      }
      return { success: true, blockedUrl };
    },

    getBlockedUrl: async () => {
      const tabId = sender.tab?.id;
      if (tabId !== undefined && pendingBlockedUrls.has(tabId)) {
        return { url: pendingBlockedUrls.get(tabId) };
      }
      return { url: "" };
    },

    getStats: async (msg) => {
      const from = msg["from"] as string;
      const to = msg["to"] as string;
      const prevFrom = msg["prevFrom"] as string | undefined;
      const prevTo = msg["prevTo"] as string | undefined;
      const {
        getCategoryBreakdown,
        getHourlyBreakdown,
        getRuleRanking,
        getTrendComparison,
        getTodayCount,
        getTotalCount,
      } = await import("../packages/stats/src");
      const [categories, hourly, ranking, today, total] = await Promise.all([
        getCategoryBreakdown(from, to),
        getHourlyBreakdown(from, to),
        getRuleRanking(from, to),
        getTodayCount(),
        getTotalCount(),
      ]);
      let trend = null;
      if (prevFrom !== undefined && prevTo !== undefined) {
        trend = await getTrendComparison(from, to, prevFrom, prevTo);
      }
      return { categories, hourly, ranking, today, total, trend };
    },

    exportData: async (msg) => {
      const categories = msg["categories"] as string[];
      return exportData(categories as Parameters<typeof exportData>[0]);
    },

    importData: async (msg) => {
      const json = msg["json"] as string;
      const categories = msg["categories"] as string[];
      const mode = msg["mode"] as "merge" | "replace";
      return importData(json, categories as Parameters<typeof importData>[1], mode);
    },

    validateImport: async (msg) => {
      const json = msg["json"] as string;
      return validateImportData(json);
    },

    // ── AI Handlers ──

    "ai:categorize": async (msg) => {
      const siteUrl = msg["siteUrl"] as string;
      const { categorizeSite } = await import("../packages/ai/src");
      return categorizeSite(siteUrl);
    },

    "ai:generateQuote": async (msg) => {
      const category = msg["category"] as Category;
      const { generateQuote } = await import("../packages/ai/src");
      return generateQuote(category);
    },

    "ai:parseNLRule": async (msg) => {
      const nlInput = msg["nlInput"] as string;
      const { parseNaturalLanguageRule } = await import("../packages/ai/src");
      return parseNaturalLanguageRule(nlInput);
    },

    "ai:analyzeStats": async (msg) => {
      const from = msg["from"] as string;
      const to = msg["to"] as string;
      const { analyzeStats } = await import("../packages/ai/src");
      return analyzeStats(from, to);
    },

    "ai:setApiKey": async (msg) => {
      const record = msg["record"] as {
        provider: string;
        key: string;
        baseUrl?: string;
        model?: string;
      };
      const { apiKeys } = await import("../packages/storage/src");
      await apiKeys.put(record);
      return { success: true };
    },

    "ai:getApiKeys": async () => {
      const { apiKeys } = await import("../packages/storage/src");
      const records = await apiKeys.getAll();
      return records.map((r) => ({
        ...r,
        key: r.key ? `••••${r.key.slice(-4)}` : "",
      }));
    },

    "ai:removeApiKey": async (msg) => {
      const provider = msg["provider"] as string;
      const { apiKeys } = await import("../packages/storage/src");
      await apiKeys.remove(provider);
      return { success: true };
    },

    "ai:testConnection": async (msg) => {
      const provider = msg["provider"] as string;
      const model = msg["model"] as string;
      const { callAI } = await import("../packages/ai/src");
      await callAI(
        provider as Parameters<typeof callAI>[0],
        model,
        [{ role: "user", content: "Reply with just the word 'OK'." }],
        "test-connection",
      );
      return { success: true };
    },

    "ai:getFeatureConfig": async () => {
      const saved = await settings.get("aiFeatures");
      return (saved as Record<string, boolean>) ?? {};
    },

    "ai:setFeatureConfig": async (msg) => {
      const features = msg["features"] as Record<string, unknown>;
      const existing = ((await settings.get("aiFeatures")) as Record<string, unknown>) ?? {};
      await settings.set("aiFeatures", { ...existing, ...features });
      return { success: true };
    },

    "ai:getSmartRules": async () => {
      const rules = (await settings.get("aiSmartRules")) as
        | { id: string; description: string; category: string; enabled: boolean }[]
        | undefined;
      return rules ?? [];
    },

    "ai:addSmartRule": async (msg) => {
      const rule = msg["rule"] as {
        description: string;
        category: string;
      };
      const rules =
        ((await settings.get("aiSmartRules")) as
          | { id: string; description: string; category: string; enabled: boolean }[]
          | undefined) ?? [];
      rules.push({
        id: crypto.randomUUID(),
        description: rule.description,
        category: rule.category,
        enabled: true,
      });
      await settings.set("aiSmartRules", rules);
      return { success: true, rules };
    },

    "ai:removeSmartRule": async (msg) => {
      const id = msg["id"] as string;
      const rules =
        ((await settings.get("aiSmartRules")) as
          | { id: string; description: string; category: string; enabled: boolean }[]
          | undefined) ?? [];
      await settings.set(
        "aiSmartRules",
        rules.filter((r) => r.id !== id),
      );
      return { success: true };
    },

    "ai:toggleSmartRule": async (msg) => {
      const id = msg["id"] as string;
      const enabled = msg["enabled"] as boolean;
      const rules =
        ((await settings.get("aiSmartRules")) as
          | { id: string; description: string; category: string; enabled: boolean }[]
          | undefined) ?? [];
      const idx = rules.findIndex((r) => r.id === id);
      if (idx >= 0) {
        rules[idx] = { ...rules[idx]!, enabled };
        await settings.set("aiSmartRules", rules);
      }
      return { success: true };
    },

    "ai:getCallLogs": async () => {
      const logs =
        ((await settings.get("aiCallLogs")) as
          | {
              id: string;
              timestamp: number;
              provider: string;
              feature: string;
              input: string;
              output: string;
              success: boolean;
            }[]
          | undefined) ?? [];
      return logs.reverse();
    },

    "ai:clearCallLogs": async () => {
      await settings.set("aiCallLogs", []);
      return { success: true };
    },

    "ai:classifyUrl": async (msg) => {
      const url = msg["url"] as string;
      const title = msg["title"] as string;
      const rules =
        ((await settings.get("aiSmartRules")) as
          | { id: string; description: string; category: string; enabled: boolean }[]
          | undefined) ?? [];
      const activeDescriptions = rules.filter((r) => r.enabled).map((r) => r.description);
      if (activeDescriptions.length === 0) return { blocked: false };

      const { classifyUrl } = await import("../packages/ai/src");
      return classifyUrl(url, title, activeDescriptions);
    },
  };

  const handler = handlers[type];
  if (handler !== undefined) {
    return handler(message, sender);
  }
  return { error: `Unknown message type: ${type}` };
}
