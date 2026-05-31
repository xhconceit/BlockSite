import { useState, useEffect, useCallback } from 'react';
import type { AppConfig } from '../types';
import { DEFAULT_CONFIG } from '../types';
import { loadConfig, saveConfig } from '../lib/storage';

export function useConfig() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const c = await loadConfig();
    setConfig(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(async (partial: Partial<AppConfig>) => {
    const updated = { ...config, ...partial };
    setConfig(updated);
    await saveConfig(updated);
    return updated;
  }, [config]);

  const sendMessage = useCallback(async (type: string, payload: any = {}) => {
    return await chrome.runtime.sendMessage({ type, ...payload });
  }, []);

  return { config, setConfig, loading, refresh, update, sendMessage };
}
