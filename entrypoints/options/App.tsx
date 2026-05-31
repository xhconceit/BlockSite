import { useState, useEffect, useCallback } from 'react';
import type { AppConfig, BlockType, Category } from '../../types';
import { DEFAULT_CONFIG } from '../../types';
import { loadConfig, saveConfig, updateConfig } from '../../lib/storage';
import { applyRules, clearAllRules } from '../../lib/rules';
import { setupAlarms, clearAlarms } from '../../lib/scheduler';
import { useRules } from '../../hooks/useRules';
import { useSchedule } from '../../hooks/useSchedule';
import { usePassword } from '../../hooks/usePassword';
import { generateId } from '../../utils/id';
import Tabs from '../../components/ui/Tabs';
import { ToastContainer } from '../../components/ui/Toast';
import RuleList from '../../components/RuleList';
import ScheduleConfigPanel from '../../components/ScheduleConfig';
import PasswordConfig from '../../components/PasswordConfig';
import CategoryPresets from '../../components/CategoryPresets';
import ImportExport from '../../components/ImportExport';

const TABS = [
  { key: 'rules', label: '拦截列表', icon: '🚫' },
  { key: 'presets', label: '分类预设', icon: '📦' },
  { key: 'schedule', label: '定时设置', icon: '⏰' },
  { key: 'password', label: '密码保护', icon: '🔒' },
  { key: 'io', label: '导入导出', icon: '📁' },
];

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState('rules');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  const persistConfig = useCallback(async (updated: AppConfig) => {
    setConfig(updated);
    await saveConfig(updated);
    if (updated.enabled) {
      await applyRules(updated.blockedItems);
    }
    await chrome.runtime.sendMessage({
      type: 'updateConfig',
      config: updated,
    });
  }, []);

  const handleItemsChange = useCallback(
    async (items: typeof config.blockedItems) => {
      const updated = { ...config, blockedItems: items };
      await persistConfig(updated);
    },
    [config, persistConfig],
  );

  const {
    filteredItems,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterCategory,
    setFilterCategory,
    addItem,
    updateItem,
    removeItem,
    toggleItem,
  } = useRules(config.blockedItems, handleItemsChange);

  const schedule = useSchedule(config.schedule, async (updatedSchedule) => {
    const updated = { ...config, schedule: updatedSchedule };
    await persistConfig(updated);
  });

  const password = usePassword(config.passwordEnabled, config.passwordHash);

  const handleScheduleSave = useCallback(async () => {
    const updated = { ...config, schedule: schedule.schedule };
    await persistConfig(updated);
    await chrome.runtime.sendMessage({
      type: 'updateSchedule',
      schedule: schedule.schedule,
    });
  }, [config, schedule.schedule, persistConfig]);

  const handlePasswordSave = useCallback(
    async (enabled: boolean, hash: string) => {
      const updated = { ...config, passwordEnabled: enabled, passwordHash: hash };
      await persistConfig(updated);
      await chrome.runtime.sendMessage({
        type: 'updatePassword',
        enabled,
        hash,
      });
    },
    [config, persistConfig],
  );

  const handleAddPresetItems = useCallback(
    (items: { type: BlockType; value: string; category: Category; customMessage: string }[]) => {
      const newItems = items.map((item) => ({
        id: generateId(),
        ...item,
        enabled: true,
      }));
      const updated = { ...config, blockedItems: [...config.blockedItems, ...newItems] };
      handleItemsChange(updated.blockedItems);
    },
    [config, handleItemsChange],
  );

  const handleImport = useCallback(async () => {
    const c = await loadConfig();
    setConfig(c);
    schedule.setSchedule(c.schedule);
    password.reset();
    password.setEnabled(c.passwordEnabled);
    password.setStoredHash(c.passwordHash);
    password.setIsVerified(!c.passwordEnabled);
    await applyRules(c.blockedItems);
  }, [schedule, password]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-text-muted)]">
        <div className="text-center">
          <div className="text-5xl mb-4">🛡️</div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h1 className="text-xl font-bold">BlockSite 设置</h1>
            <p className="text-sm text-[var(--color-text-muted)]">管理你的拦截规则和偏好设置</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-6">
          {activeTab === 'rules' && (
            <RuleList
              items={filteredItems}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterType={filterType}
              onFilterTypeChange={setFilterType}
              filterCategory={filterCategory}
              onFilterCategoryChange={setFilterCategory}
              onToggle={toggleItem}
              onUpdate={updateItem}
              onDelete={removeItem}
              onAdd={addItem}
            />
          )}
          {activeTab === 'presets' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">分类预设</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                一键添加常见网站的拦截规则，按分类展示不同的拦截页面
              </p>
              <CategoryPresets onAddItems={handleAddPresetItems} />
            </div>
          )}
          {activeTab === 'schedule' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">定时拦截</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                在指定时间段自动开启拦截，帮你保持专注
              </p>
              <ScheduleConfigPanel
                schedule={schedule.schedule}
                onToggleEnabled={schedule.toggleEnabled}
                onUpdate={schedule.update}
                onToggleDay={schedule.toggleDay}
                onSave={handleScheduleSave}
              />
            </div>
          )}
          {activeTab === 'password' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">密码保护</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                需要密码才能修改设置和临时解锁
              </p>
              <PasswordConfig
                enabled={password.enabled}
                isVerified={password.isVerified}
                onSetPassword={password.setPassword}
                onCheckPassword={password.checkPassword}
                onRemovePassword={password.removePassword}
                onSave={handlePasswordSave}
              />
            </div>
          )}
          {activeTab === 'io' && (
            <div>
              <h2 className="text-lg font-semibold mb-4">导入 / 导出</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-6">
                备份你的配置，或者从其他设备导入配置
              </p>
              <ImportExport onImport={handleImport} />
            </div>
          )}
        </div>
      </div>

      <ToastContainer />
    </div>
  );
}
