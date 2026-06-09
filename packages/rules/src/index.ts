import type { BlockedItem, BlockType, Category } from "@blocksite/core";
import { DNR_RULE_ID_BASE, MAX_DNR_RULES } from "@blocksite/core";
import { rules as rulesRepo } from "@blocksite/storage";
import { emitter } from "@blocksite/event-bus";

export async function getAll(): Promise<BlockedItem[]> {
  return rulesRepo.getAll();
}

export async function getById(id: string): Promise<BlockedItem | undefined> {
  return rulesRepo.getById(id);
}

function cleanValue(type: BlockType, value: string): string {
  let v = value.trim().toLowerCase();
  if (type === "domain") {
    v = v.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
  return v;
}

export function createItem(
  type: BlockType,
  value: string,
  category: Category,
  customMessage: string,
  currentMaxOrder: number,
): BlockedItem {
  return {
    id: crypto.randomUUID(),
    type,
    value: cleanValue(type, value),
    enabled: true,
    category,
    customMessage: customMessage.trim(),
    order: currentMaxOrder + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function add(item: BlockedItem): Promise<BlockedItem> {
  validateItem(item);
  await rulesRepo.put(item);
  emitter.emit("rule:added", { item });
  return item;
}

export async function update(item: BlockedItem): Promise<BlockedItem> {
  validateItem(item);
  const updated: BlockedItem = { ...item, updatedAt: Date.now() };
  await rulesRepo.put(updated);
  emitter.emit("rule:updated", { item: updated });
  return updated;
}

export async function remove(id: string): Promise<void> {
  await rulesRepo.delete(id);
  emitter.emit("rule:removed", { id });
}

export async function toggle(id: string, enabled: boolean): Promise<BlockedItem | undefined> {
  const item = await rulesRepo.getById(id);
  if (item === undefined) return undefined;
  item.enabled = enabled;
  item.updatedAt = Date.now();
  await rulesRepo.put(item);
  emitter.emit("rule:updated", { item });
  return item;
}

export async function batchDelete(ids: string[]): Promise<void> {
  await rulesRepo.bulkDelete(ids);
  for (const id of ids) {
    emitter.emit("rule:removed", { id });
  }
}

export async function batchToggle(ids: string[], enabled: boolean): Promise<void> {
  const all = await rulesRepo.getAll();
  const toUpdate: BlockedItem[] = [];
  for (const item of all) {
    if (ids.includes(item.id)) {
      toUpdate.push({ ...item, enabled, updatedAt: Date.now() });
    }
  }
  if (toUpdate.length > 0) {
    await rulesRepo.bulkUpdate(toUpdate);
    for (const item of toUpdate) {
      emitter.emit("rule:updated", { item });
    }
  }
}

export async function reorder(ids: string[]): Promise<void> {
  const all = await rulesRepo.getAll();
  const items: BlockedItem[] = [];
  for (let i = 0; i < ids.length; i++) {
    const item = all.find((r) => r.id === ids[i]);
    if (item !== undefined) {
      items.push({ ...item, order: i, updatedAt: Date.now() });
    }
  }
  if (items.length > 0) {
    await rulesRepo.bulkUpdate(items);
    emitter.emit("rules:changed", { items: await rulesRepo.getAll() });
  }
}

export async function search(value: string): Promise<BlockedItem[]> {
  const all = await rulesRepo.getAll();
  const q = value.toLowerCase();
  return all.filter((item) => item.value.includes(q));
}

export async function filterByType(type: BlockType | "all"): Promise<BlockedItem[]> {
  const all = await rulesRepo.getAll();
  if (type === "all") return all;
  return all.filter((item) => item.type === type);
}

export async function filterByCategory(category: Category | "all"): Promise<BlockedItem[]> {
  const all = await rulesRepo.getAll();
  if (category === "all") return all;
  return all.filter((item) => item.category === category);
}

export async function searchAndFilter(
  value: string,
  type: BlockType | "all",
  category: Category | "all",
): Promise<BlockedItem[]> {
  const all = await rulesRepo.getAll();
  const q = value.toLowerCase();
  return all.filter((item) => {
    if (q !== "" && !item.value.includes(q)) return false;
    if (type !== "all" && item.type !== type) return false;
    if (category !== "all" && item.category !== category) return false;
    return true;
  });
}

// ── Validation ──

function validateItem(item: BlockedItem): void {
  if (item.value.trim().length === 0) {
    throw new Error("Rule value cannot be empty");
  }
  if (item.type === "regex") {
    try {
      new RegExp(item.value);
    } catch {
      throw new Error(`Invalid regular expression: ${item.value}`);
    }
  }
  if (item.type === "wildcard") {
    if (!item.value.includes("*") && !item.value.includes("?")) {
      throw new Error("Wildcard rule must contain * or ?");
    }
  }
}

export function testRegex(
  pattern: string,
  testUrls: string[],
): { url: string; matches: boolean }[] {
  try {
    const re = new RegExp(pattern);
    return testUrls.map((url) => ({ url, matches: re.test(url) }));
  } catch {
    throw new Error(`Invalid regular expression: ${pattern}`);
  }
}

export function globToRegex(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\*/g, ".*")
    .replace(/\\\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

// ── DNR Conversion ──

export function buildDeclarativeRules(items: BlockedItem[]): chrome.declarativeNetRequest.Rule[] {
  const active = items.filter((item) => item.enabled);
  const rules: chrome.declarativeNetRequest.Rule[] = [];

  for (let i = 0; i < active.length; i++) {
    const item = active[i];
    if (item === undefined) continue;
    const ruleId = DNR_RULE_ID_BASE + i;
    const rule = buildRule(item, ruleId);
    if (rule !== null) {
      rules.push(rule);
    }
  }

  return rules;
}

function buildRule(item: BlockedItem, ruleId: number): chrome.declarativeNetRequest.Rule | null {
  const base = {
    id: ruleId,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: {
        extensionPath: `/blocked.html?ruleId=${encodeURIComponent(item.id)}&category=${encodeURIComponent(item.category)}&customMessage=${encodeURIComponent(item.customMessage)}`,
      },
    },
  } satisfies Partial<chrome.declarativeNetRequest.Rule>;

  switch (item.type) {
    case "domain":
      return {
        ...base,
        condition: {
          requestDomains: [item.value],
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      } as chrome.declarativeNetRequest.Rule;

    case "path":
      return {
        ...base,
        condition: {
          regexFilter: buildPathRegex(item.value),
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      } as chrome.declarativeNetRequest.Rule;

    case "keyword":
      return {
        ...base,
        condition: {
          urlFilter: `*${item.value}*`,
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      } as chrome.declarativeNetRequest.Rule;

    case "regex":
      return {
        ...base,
        condition: {
          regexFilter: item.value,
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      } as chrome.declarativeNetRequest.Rule;

    case "wildcard": {
      const filter = globToUrlFilter(item.value);
      if (filter !== null) {
        return {
          ...base,
          condition: {
            urlFilter: filter,
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
          },
        } as chrome.declarativeNetRequest.Rule;
      }
      return null;
    }

    default:
      return null;
  }
}

function buildPathRegex(pathValue: string): string {
  const slashIndex = pathValue.indexOf("/");
  const domain = slashIndex > 0 ? pathValue.slice(0, slashIndex) : pathValue;
  const path = slashIndex > 0 ? pathValue.slice(slashIndex) : "";
  const domainRegex = domain.replace(/\./g, "\\.");
  if (path) {
    return `^https?://(www\\.)?${domainRegex}${escapeRegExp(path)}`;
  }
  return `^https?://(www\\.)?${domainRegex}/`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globToUrlFilter(glob: string): string | null {
  if (glob === "*") return null;
  return `*://${glob}/*`;
}

// ── DNR Sync ──

export async function applyRules(items: BlockedItem[]): Promise<number> {
  const rules = buildDeclarativeRules(items);
  const oldRuleIds = (await chrome.declarativeNetRequest.getDynamicRules()).map((r) => r.id);
  const removeIds = oldRuleIds.filter((id) => id >= DNR_RULE_ID_BASE);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: rules,
  });

  emitter.emit("rules:applied", { count: rules.length });
  return rules.length;
}

export async function clearAllRules(): Promise<void> {
  const oldRuleIds = (await chrome.declarativeNetRequest.getDynamicRules()).map((r) => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
  });
  emitter.emit("rules:cleared", undefined);
}

export function checkRuleLimit(items: BlockedItem[]): {
  current: number;
  max: number;
  warning: boolean;
} {
  const enabled = items.filter((i) => i.enabled).length;
  return {
    current: enabled,
    max: MAX_DNR_RULES,
    warning: enabled > MAX_DNR_RULES * 0.9,
  };
}
