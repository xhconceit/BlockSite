import type { CategoryInfo } from "@blocksite/core";
import { CATEGORIES, CATEGORY_INFO } from "@blocksite/core";
import { settings } from "@blocksite/storage";

const CUSTOM_CATEGORIES_KEY = "categories";

async function getCustomCategories(): Promise<Record<string, CategoryInfo>> {
  return ((await settings.get(CUSTOM_CATEGORIES_KEY)) as Record<string, CategoryInfo>) ?? {};
}

async function saveCustomCategories(data: Record<string, CategoryInfo>): Promise<void> {
  await settings.set(CUSTOM_CATEGORIES_KEY, data);
}

const PALETTE = [
  "#60A5FA",
  "#F87171",
  "#4ADE80",
  "#FBBF24",
  "#C084FC",
  "#818CF8",
  "#FB923C",
  "#34D399",
  "#A78BFA",
  "#F472B6",
];

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function lightenColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, r + 40);
  const lg = Math.min(255, g + 40);
  const lb = Math.min(255, b + 40);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

export async function getAllCategoryKeys(): Promise<string[]> {
  const custom = await getCustomCategories();
  return [...CATEGORIES, ...Object.keys(custom)];
}

export async function getAllCategoryInfo(): Promise<Record<string, CategoryInfo>> {
  const custom = await getCustomCategories();
  return { ...CATEGORY_INFO, ...custom };
}

export async function getCategoryInfo(key: string): Promise<CategoryInfo> {
  if (key in CATEGORY_INFO) {
    return CATEGORY_INFO[key]!;
  }
  const custom = await getCustomCategories();
  if (custom[key]) return custom[key]!;
  const color = PALETTE[hashString(key) % PALETTE.length]!;
  return {
    key,
    label: key,
    labelEn: key,
    themeColor: color,
    themeColorLight: lightenColor(color),
  };
}

export async function addCategory(info: CategoryInfo): Promise<void> {
  const custom = await getCustomCategories();
  if (info.key in CATEGORY_INFO || custom[info.key]) {
    throw new Error(`Category "${info.key}" already exists`);
  }
  custom[info.key] = { ...info, isBuiltIn: false };
  await saveCustomCategories(custom);
}

export async function updateCategory(
  key: string,
  info: Partial<Omit<CategoryInfo, "key" | "isBuiltIn">>,
): Promise<void> {
  if (key in CATEGORY_INFO) {
    const overrides =
      ((await settings.get("categoryOverrides")) as Record<string, Partial<CategoryInfo>>) ?? {};
    overrides[key] = { ...overrides[key], ...info };
    await settings.set("categoryOverrides", overrides);
  } else {
    const custom = await getCustomCategories();
    if (!custom[key]) throw new Error(`Category "${key}" not found`);
    custom[key] = { ...custom[key]!, ...info, key };
    await saveCustomCategories(custom);
  }
}

export async function deleteCategory(key: string): Promise<void> {
  if (key in CATEGORY_INFO) {
    throw new Error("Cannot delete built-in categories");
  }
  const custom = await getCustomCategories();
  delete custom[key];
  await saveCustomCategories(custom);
}

export async function getEffectiveCategoryInfo(key: string): Promise<CategoryInfo> {
  const base = await getCategoryInfo(key);
  const overrides =
    ((await settings.get("categoryOverrides")) as Record<string, Partial<CategoryInfo>>) ?? {};
  if (overrides[key]) {
    return { ...base, ...overrides[key] };
  }
  return base;
}
