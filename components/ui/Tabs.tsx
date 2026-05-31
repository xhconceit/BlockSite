import type { ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
  icon?: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex border-b border-[var(--color-border)]">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px cursor-pointer ${
            activeTab === tab.key
              ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text)]'
          }`}
        >
          {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
