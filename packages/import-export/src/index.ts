import type { BlockedItem, ScheduleConfig, QuoteItem, Category } from "@blocksite/core";
import {
  rules as rulesRepo,
  presets as presetsRepo,
  schedule as scheduleRepo,
  auth as authRepo,
} from "@blocksite/storage";

export type ExportCategory = "rules" | "presets" | "schedule" | "auth" | "stats";

export interface ExportData {
  version: string;
  exportedAt: string;
  rules?: BlockedItem[];
  presets?: Record<Category, { sites: string[]; quotes: QuoteItem[] }>;
  schedule?: ScheduleConfig;
  auth?: Record<Category, string>;
  stats?: { totalBlocked: number };
}

export interface ImportResult {
  success: boolean;
  imported: ExportCategory[];
  errors: string[];
  preview?: ExportData;
}

export async function exportData(categories: ExportCategory[]): Promise<string> {
  const data: ExportData = {
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
  };

  if (categories.includes("rules")) {
    data.rules = await rulesRepo.getAll();
  }
  if (categories.includes("presets")) {
    const cats: Category[] = ["social", "video", "game", "news", "adult", "custom"];
    const presetsData: Record<Category, { sites: string[]; quotes: QuoteItem[] }> = {} as Record<
      Category,
      { sites: string[]; quotes: QuoteItem[] }
    >;
    for (const cat of cats) {
      presetsData[cat] = {
        sites: await presetsRepo.getSites(cat),
        quotes: await presetsRepo.getQuotes(cat),
      };
    }
    data.presets = presetsData;
  }
  if (categories.includes("schedule")) {
    data.schedule = await scheduleRepo.get();
  }
  if (categories.includes("auth")) {
    const authData = {} as Record<Category, string>;
    for (const cat of ["social", "video", "game", "news", "adult", "custom"] as Category[]) {
      const hash = await authRepo.getHash(cat);
      if (hash !== undefined) {
        authData[cat] = hash;
      }
    }
    data.auth = authData;
  }

  return JSON.stringify(data, null, 2);
}

export function validateImportData(json: string): {
  valid: boolean;
  data?: ExportData;
  errors: string[];
} {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    errors.push("Invalid JSON format");
    return { valid: false, errors };
  }

  if (typeof parsed !== "object" || parsed === null) {
    errors.push("Root must be an object");
    return { valid: false, errors };
  }

  const data = parsed as Record<string, unknown>;

  if (typeof data["version"] !== "string") {
    errors.push("Missing or invalid version field");
  }

  if (data["rules"] !== undefined) {
    if (!Array.isArray(data["rules"])) {
      errors.push("rules must be an array");
    } else {
      const rulesArr = data["rules"] as unknown[];
      for (let i = 0; i < rulesArr.length; i++) {
        const rule = rulesArr[i] as Record<string, unknown>;
        if (typeof rule["id"] !== "string") errors.push(`rules[${i}].id must be a string`);
        if (typeof rule["type"] !== "string") errors.push(`rules[${i}].type must be a string`);
        if (typeof rule["value"] !== "string") errors.push(`rules[${i}].value must be a string`);
      }
    }
  }

  return { valid: errors.length === 0, data: data as unknown as ExportData, errors };
}

export async function importData(
  json: string,
  categories: ExportCategory[],
  mode: "merge" | "replace",
): Promise<ImportResult> {
  const { valid, data, errors } = validateImportData(json);
  if (!valid || data === undefined) {
    return { success: false, imported: [], errors };
  }

  const imported: ExportCategory[] = [];
  const importErrors: string[] = [];

  try {
    if (categories.includes("rules") && data.rules) {
      if (mode === "replace") {
        const existing = await rulesRepo.getAll();
        if (existing.length > 0) {
          await rulesRepo.bulkDelete(existing.map((r) => r.id));
        }
      }
      for (const rule of data.rules) {
        await rulesRepo.put({
          ...rule,
          id: rule.id || crypto.randomUUID(),
          type: rule.type || "domain",
          value: rule.value || "",
          enabled: rule.enabled ?? true,
          category: rule.category || "custom",
          customMessage: rule.customMessage || "",
          order: rule.order ?? 0,
          createdAt: rule.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
      }
      imported.push("rules");
    }

    if (categories.includes("presets") && data.presets) {
      for (const [cat, preset] of Object.entries(data.presets)) {
        if (preset && typeof preset === "object" && "sites" in preset) {
          await presetsRepo.setSites(cat as Category, (preset as { sites: string[] }).sites);
        }
        if (preset && typeof preset === "object" && "quotes" in preset) {
          await presetsRepo.setQuotes(cat as Category, (preset as { quotes: QuoteItem[] }).quotes);
        }
      }
      imported.push("presets");
    }

    if (categories.includes("schedule") && data.schedule) {
      await scheduleRepo.put(data.schedule as ScheduleConfig);
      imported.push("schedule");
    }

    if (categories.includes("auth") && data.auth) {
      for (const [cat, hash] of Object.entries(data.auth)) {
        if (typeof hash === "string") {
          await authRepo.setHash(cat as Category, hash);
        }
      }
      imported.push("auth");
    }
  } catch (err) {
    importErrors.push(err instanceof Error ? err.message : "Import failed");
  }

  return {
    success: importErrors.length === 0,
    imported,
    errors: [...errors, ...importErrors],
  };
}
