import { initStorage, rules as rulesRepo, settings } from "../packages/storage/src";
import { applyRules, clearAllRules, getAll, createItem } from "../packages/rules/src";
import { getConfig, saveConfig, isActive } from "../packages/schedule/src";
import { checkExpiry } from "../packages/unlock/src";
import { recordBlock } from "../packages/stats/src";
import { exportData, importData, validateImportData } from "../packages/import-export/src";
import type { Category, AppConfig, BlockedItem } from "../packages/core/src";
import { DEFAULT_APP_CONFIG } from "../packages/core/src";

const pendingBlockedUrls = new Map<number, string>();
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
    if (details.frameType === "outermost_frame" || details.frameId === 0) {
      pendingBlockedUrls.set(details.tabId, details.url);
    }
  });

  chrome.webNavigation.onCommitted.addListener((details) => {
    if (
      (details.frameType === "outermost_frame" || details.frameId === 0) &&
      details.url.startsWith(chrome.runtime.getURL(""))
    ) {
      return;
    }
    pendingBlockedUrls.delete(details.tabId);
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
      return { config, rules, schedule: scheduleConfig, unlockStates };
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
      return checkExpiry(category);
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
  };

  const handler = handlers[type];
  if (handler !== undefined) {
    return handler(message, sender);
  }
  return { error: `Unknown message type: ${type}` };
}
