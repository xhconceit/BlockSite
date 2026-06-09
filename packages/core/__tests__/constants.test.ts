import { describe, it, expect } from "vitest";
import {
  CATEGORIES,
  CATEGORY_INFO,
  DEFAULT_APP_CONFIG,
  BLOCK_TYPE_LABELS,
  MAX_UNLOCK_MINUTES,
  MIN_UNLOCK_MINUTES,
  MAX_DNR_RULES,
  DNR_RULE_ID_BASE,
} from "../src/constants";

describe("CATEGORIES", () => {
  it("contains all 6 categories", () => {
    expect(CATEGORIES).toHaveLength(6);
  });

  it("includes all expected category keys", () => {
    expect(CATEGORIES).toContain("social");
    expect(CATEGORIES).toContain("video");
    expect(CATEGORIES).toContain("game");
    expect(CATEGORIES).toContain("news");
    expect(CATEGORIES).toContain("adult");
    expect(CATEGORIES).toContain("custom");
  });
});

describe("CATEGORY_INFO", () => {
  it("has info for every category", () => {
    for (const cat of CATEGORIES) {
      expect(CATEGORY_INFO[cat]).toBeDefined();
      expect(CATEGORY_INFO[cat].key).toBe(cat);
      expect(CATEGORY_INFO[cat].label).toBeTruthy();
      expect(CATEGORY_INFO[cat].themeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(CATEGORY_INFO[cat].themeColorLight).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("has different colors for each category", () => {
    const colors = new Set(CATEGORIES.map((c) => CATEGORY_INFO[c].themeColor));
    expect(colors.size).toBe(CATEGORIES.length);
  });
});

describe("DEFAULT_APP_CONFIG", () => {
  it("has enabled true by default", () => {
    expect(DEFAULT_APP_CONFIG.enabled).toBe(true);
  });

  it("has auto-recover of 30 minutes", () => {
    expect(DEFAULT_APP_CONFIG.autoRecoverMinutes).toBe(30);
  });
});

describe("BLOCK_TYPE_LABELS", () => {
  it("has labels for all 5 block types", () => {
    expect(BLOCK_TYPE_LABELS["domain"]).toBe("域名");
    expect(BLOCK_TYPE_LABELS["path"]).toBe("路径");
    expect(BLOCK_TYPE_LABELS["keyword"]).toBe("关键词");
    expect(BLOCK_TYPE_LABELS["regex"]).toBe("正则");
    expect(BLOCK_TYPE_LABELS["wildcard"]).toBe("通配符");
  });
});

describe("constants ranges", () => {
  it("MIN_UNLOCK_MINUTES is 1", () => {
    expect(MIN_UNLOCK_MINUTES).toBe(1);
  });

  it("MAX_UNLOCK_MINUTES is 480 (8 hours)", () => {
    expect(MAX_UNLOCK_MINUTES).toBe(480);
  });

  it("MAX_DNR_RULES is 5000", () => {
    expect(MAX_DNR_RULES).toBe(5000);
  });

  it("DNR_RULE_ID_BASE is 1000", () => {
    expect(DNR_RULE_ID_BASE).toBe(1000);
  });
});
