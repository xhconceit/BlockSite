export type BlockType = 'domain' | 'path' | 'keyword' | 'regex';

export type Category = 'social' | 'video' | 'game' | 'news' | 'adult' | 'custom';

export interface BlockedItem {
  id: string;
  type: BlockType;
  value: string;
  enabled: boolean;
  category: Category;
  customMessage: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  days: number[];
}

export interface BlockStats {
  totalBlocked: number;
  todayBlocked: number;
  todayDate: string;
}

export interface AppConfig {
  enabled: boolean;
  blockedItems: BlockedItem[];
  schedule: ScheduleConfig;
  passwordEnabled: boolean;
  passwordHash: string;
  tempUnlockUntil: number | null;
  stats: BlockStats;
}

export interface CategoryInfo {
  key: Category;
  label: string;
  themeColor: string;
  defaultQuotes: string[];
}

export interface QuoteResult {
  text: string;
  author: string;
  themeColor: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  enabled: true,
  blockedItems: [],
  schedule: {
    enabled: false,
    startHour: 9,
    startMinute: 0,
    endHour: 18,
    endMinute: 0,
    days: [1, 2, 3, 4, 5],
  },
  passwordEnabled: false,
  passwordHash: '',
  tempUnlockUntil: null,
  stats: {
    totalBlocked: 0,
    todayBlocked: 0,
    todayDate: '',
  },
};

export interface MessagePayloads {
  updateRules: void;
  toggleEnabled: { enabled: boolean };
  tempUnlock: { minutes: number };
  getConfig: void;
  updateConfig: { config: Partial<AppConfig> };
  blockPageOpened: { url: string; ruleId: string };
}
