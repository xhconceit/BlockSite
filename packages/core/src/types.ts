export type BlockType = "domain" | "path" | "keyword" | "regex" | "wildcard";

export type Category = string;

export type BuiltInCategory = "social" | "video" | "game" | "news" | "adult" | "custom";

export interface BlockedItem {
  id: string;
  type: BlockType;
  value: string;
  enabled: boolean;
  category: Category;
  customMessage: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface SchedulePeriod {
  id: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  days: number[];
}

export interface PomodoroConfig {
  enabled: boolean;
  workMinutes: number;
  breakMinutes: number;
  cycles: number;
}

export interface DateExclusion {
  id: string;
  type: "once" | "recurring";
  date: string;
  description: string;
}

export interface ScheduleConfig {
  enabled: boolean;
  periods: SchedulePeriod[];
  pomodoro: PomodoroConfig;
  exclusions: DateExclusion[];
}

export interface QuoteItem {
  id: string;
  text: string;
  author: string;
}

export interface UnlockState {
  category: Category;
  unlockedUntil: number | null;
  lockCount: number;
  lockDate: string;
  allowUnlock: boolean;
  unlockDuration: number;
  maxDailyUnlocks: number;
}

export interface BlockStatsRecord {
  id: string;
  ruleId: string;
  category: Category;
  url: string;
  timestamp: number;
}

export interface DailyStats {
  date: string;
  totalBlocks: number;
  byCategory: Record<string, number>;
  byRule: Record<string, number>;
  byHour: Record<number, number>;
}

export interface CategoryInfo {
  key: string;
  label: string;
  labelEn: string;
  themeColor: string;
  themeColorLight: string;
  isBuiltIn?: boolean;
}

export interface AppConfig {
  enabled: boolean;
  autoRecoverMinutes: number;
  locale: "auto" | "en" | "zh_CN";
}

export interface EventMap {
  "rules:changed": { items: BlockedItem[] };
  "rule:added": { item: BlockedItem };
  "rule:updated": { item: BlockedItem };
  "rule:removed": { id: string };
  "rules:applied": { count: number };
  "rules:cleared": void;
  "schedule:changed": { config: ScheduleConfig };
  "schedule:activated": { timestamp: number };
  "schedule:deactivated": { timestamp: number };
  "pomodoro:tick": { cycle: number; type: "work" | "break"; remaining: number };
  "unlock:granted": { category: string; until: number };
  "unlock:expired": { category: string };
  "unlock:extended": { category: string; until: number };
  "unlock:countReached": { category: string };
  "block:recorded": { ruleId: string; category: string; url: string };
  "toggle:changed": { enabled: boolean };
  "state:changed": { enabled: boolean };
}
