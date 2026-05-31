import { useState, useEffect, useCallback } from 'react';
import type { AppConfig } from '../../types';
import { loadConfig, saveConfig } from '../../lib/storage';
import { applyRules, clearAllRules } from '../../lib/rules';
import { useCurrentTab } from '../../hooks/useCurrentTab';
import { extractDomain } from '../../utils/url';
import { generateId } from '../../utils/id';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const { url, domain, title } = useCurrentTab();
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadConfig().then(setConfig);
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes['blocksite_config']) {
        setConfig(changes['blocksite_config'].newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleToggle = useCallback(async () => {
    if (!config) return;
    const enabled = !config.enabled;
    const updated = { ...config, enabled };
    setConfig(updated);
    await saveConfig(updated);
    if (enabled) {
      await applyRules(updated.blockedItems);
    } else {
      await clearAllRules();
    }
  }, [config]);

  const handleAddCurrentSite = useCallback(async () => {
    if (!config || !domain) return;
    const exists = config.blockedItems.some(
      (item) => item.type === 'domain' && item.value === domain,
    );
    if (exists) return;
    setAdding(true);
    const newItem = {
      id: generateId(),
      type: 'domain' as const,
      value: domain,
      enabled: true,
      category: 'custom' as const,
      customMessage: '',
    };
    const updatedItems = [...config.blockedItems, newItem];
    const updated = { ...config, blockedItems: updatedItems };
    setConfig(updated);
    await saveConfig(updated);
    if (updated.enabled) {
      await applyRules(updatedItems);
    }
    setAdding(false);
  }, [config, domain]);

  const isCurrentBlocked = config?.blockedItems.some(
    (item) => item.enabled && item.type === 'domain' && item.value === domain,
  );

  if (!config) {
    return <div className="p-4 text-center text-slate-500">加载中...</div>;
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛡️</span>
          <h1 className="text-lg font-bold">BlockSite</h1>
        </div>
        <ToggleSwitch checked={config.enabled} onChange={handleToggle} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-4 border-b border-[var(--color-border)]">
        <div className="bg-[var(--color-surface)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[var(--color-primary)]">{config.stats.todayBlocked}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">今日拦截</div>
        </div>
        <div className="bg-[var(--color-surface)] rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-[var(--color-success)]">{config.blockedItems.filter((i) => i.enabled).length}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">活跃规则</div>
        </div>
      </div>

      {/* Current Site */}
      {domain && (
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="text-xs text-[var(--color-text-muted)] mb-1.5">当前网站</div>
          <div className="flex items-center gap-2 mb-3">
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
              alt=""
              className="w-4 h-4 rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-sm font-medium truncate">{domain}</span>
            {isCurrentBlocked && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400">已拦截</span>
            )}
          </div>
          {isCurrentBlocked ? (
            <div className="text-xs text-slate-500">此网站已在拦截列表中</div>
          ) : (
            <button
              onClick={handleAddCurrentSite}
              disabled={adding}
              className="w-full py-2 rounded-lg text-sm font-medium bg-[var(--color-danger)] hover:bg-red-600 text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {adding ? '添加中...' : `拦截 ${domain}`}
            </button>
          )}
        </div>
      )}

      {/* Links */}
      <div className="p-4">
        <button
          onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })}
          className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--color-surface)] hover:bg-[var(--color-border)] text-[var(--color-text)] transition-colors cursor-pointer"
        >
          打开设置页面
        </button>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
        checked ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
