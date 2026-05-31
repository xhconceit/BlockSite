import type { AppConfig } from '../types';
import { DEFAULT_CONFIG } from '../types';

const STORAGE_KEY = 'blocksite_config';

export async function loadConfig(): Promise<AppConfig> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    return { ...DEFAULT_CONFIG, ...result[STORAGE_KEY] };
  }
  return { ...DEFAULT_CONFIG };
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: config });
}

export async function updateConfig(partial: Partial<AppConfig>): Promise<AppConfig> {
  const config = await loadConfig();
  const updated = { ...config, ...partial };
  await saveConfig(updated);
  return updated;
}

export async function exportConfig(): Promise<string> {
  const config = await loadConfig();
  return JSON.stringify(config, null, 2);
}

export async function importConfig(json: string): Promise<AppConfig> {
  const parsed = JSON.parse(json);
  const config = { ...DEFAULT_CONFIG, ...parsed };
  config.blockedItems = config.blockedItems.map((item: any) => ({
    id: item.id || crypto.randomUUID(),
    type: item.type || 'domain',
    value: item.value || '',
    enabled: item.enabled ?? true,
    category: item.category || 'custom',
    customMessage: item.customMessage || '',
  }));
  config.stats = config.stats || { totalBlocked: 0, todayBlocked: 0, todayDate: '' };
  await saveConfig(config);
  return config;
}

export async function incrementBlockCount(): Promise<void> {
  const config = await loadConfig();
  const today = new Date().toLocaleDateString('zh-CN');
  if (config.stats.todayDate !== today) {
    config.stats.todayDate = today;
    config.stats.todayBlocked = 1;
  } else {
    config.stats.todayBlocked++;
  }
  config.stats.totalBlocked++;
  await saveConfig(config);
}
