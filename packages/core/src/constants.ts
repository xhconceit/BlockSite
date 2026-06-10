import type { AppConfig, Category, CategoryInfo, PomodoroConfig } from "./types";

export const CATEGORIES: Category[] = ["social", "video", "game", "news", "adult", "custom"];

export const CATEGORY_INFO: Record<Category, CategoryInfo> = {
  social: {
    key: "social",
    label: "社交媒体",
    labelEn: "Social Media",
    themeColor: "#60A5FA",
    themeColorLight: "#3B82F6",
    isBuiltIn: true,
  },
  video: {
    key: "video",
    label: "视频网站",
    labelEn: "Video",
    themeColor: "#F87171",
    themeColorLight: "#EF4444",
    isBuiltIn: true,
  },
  game: {
    key: "game",
    label: "游戏",
    labelEn: "Gaming",
    themeColor: "#4ADE80",
    themeColorLight: "#22C55E",
    isBuiltIn: true,
  },
  news: {
    key: "news",
    label: "新闻资讯",
    labelEn: "News",
    themeColor: "#FBBF24",
    themeColorLight: "#F59E0B",
    isBuiltIn: true,
  },
  adult: {
    key: "adult",
    label: "成人内容",
    labelEn: "Adult",
    themeColor: "#C084FC",
    themeColorLight: "#A855F7",
    isBuiltIn: true,
  },
  custom: {
    key: "custom",
    label: "自定义",
    labelEn: "Custom",
    themeColor: "#818CF8",
    themeColorLight: "#6366F1",
    isBuiltIn: true,
  },
};

export const DEFAULT_APP_CONFIG: AppConfig = {
  enabled: true,
  autoRecoverMinutes: 30,
  locale: "auto",
};

export const DEFAULT_POMODORO: PomodoroConfig = {
  enabled: false,
  workMinutes: 25,
  breakMinutes: 5,
  cycles: 4,
};

export const BLOCK_TYPE_LABELS: Record<string, string> = {
  domain: "域名",
  path: "路径",
  keyword: "关键词",
  regex: "正则",
  wildcard: "通配符",
};

export const MAX_UNLOCK_MINUTES = 480;
export const MIN_UNLOCK_MINUTES = 1;
export const MAX_DNR_RULES = 5000;
export const DNR_RULE_ID_BASE = 1000;
export const STORAGE_DB_NAME = "blocksite";
export const STORAGE_DB_VERSION = 1;
