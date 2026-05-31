import type { BlockedItem } from '../types';

const RULE_ID_BASE = 1000;

export function buildDeclarativeRules(items: BlockedItem[]): chrome.declarativeNetRequest.Rule[] {
  const activeItems = items.filter((item) => item.enabled);
  const rules: chrome.declarativeNetRequest.Rule[] = [];

  for (let i = 0; i < activeItems.length; i++) {
    const item = activeItems[i];
    const ruleId = RULE_ID_BASE + i;
    const rule = buildRule(item, ruleId);
    if (rule) {
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
    } as chrome.declarativeNetRequest.RuleAction,
  };

  switch (item.type) {
    case 'domain':
      return {
        ...base,
        condition: {
          requestDomains: [item.value.toLowerCase()],
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      };

    case 'path':
      return {
        ...base,
        condition: {
          regexFilter: buildPathRegex(item.value),
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      };

    case 'keyword':
      return {
        ...base,
        condition: {
          urlFilter: `*${item.value.toLowerCase()}*`,
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      };

    case 'regex':
      return {
        ...base,
        condition: {
          regexFilter: item.value,
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
        },
      };

    default:
      return null;
  }
}

function buildPathRegex(pathValue: string): string {
  const parts = pathValue.split('/');
  const domain = parts[0].replace(/\./g, '\\.');
  const path = parts.slice(1).join('/');
  if (path) {
    return `^https?://(www\\.)?${domain}/${escapeRegExp(path)}`;
  }
  return `^https?://(www\\.)?${domain}/`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function applyRules(items: BlockedItem[]): Promise<void> {
  const rules = buildDeclarativeRules(items);
  const oldRuleIds = (await chrome.declarativeNetRequest.getDynamicRules()).map((r) => r.id);
  const newRuleIds = rules.map((r) => r.id);

  const removeRuleIds = oldRuleIds.filter((id) => id >= RULE_ID_BASE);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeRuleIds,
    addRules: rules,
  });
}

export async function clearAllRules(): Promise<void> {
  const oldRuleIds = (await chrome.declarativeNetRequest.getDynamicRules()).map((r) => r.id);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: oldRuleIds,
  });
}
