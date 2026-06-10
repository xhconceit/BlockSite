import { describe, it, expect } from "vitest";
import { CATEGORIES } from "../src/constants";
import { DEFAULT_PRESET_SITES, DEFAULT_QUOTES } from "../src/defaults";

describe("DEFAULT_PRESET_SITES", () => {
  it("has presets for every category", () => {
    for (const cat of CATEGORIES) {
      expect(DEFAULT_PRESET_SITES[cat]!).toBeDefined();
      expect(Array.isArray(DEFAULT_PRESET_SITES[cat]!)).toBe(true);
    }
  });

  it("social category has at least 5 preset sites", () => {
    expect(DEFAULT_PRESET_SITES["social"]!.length).toBeGreaterThanOrEqual(5);
  });

  it("video category has at least 3 preset sites", () => {
    expect(DEFAULT_PRESET_SITES["video"]!.length).toBeGreaterThanOrEqual(3);
  });

  it("game category has at least 3 preset sites", () => {
    expect(DEFAULT_PRESET_SITES["game"]!.length).toBeGreaterThanOrEqual(3);
  });

  it("custom category starts empty", () => {
    expect(DEFAULT_PRESET_SITES["custom"]!).toHaveLength(0);
  });

  it("all preset sites are non-empty strings", () => {
    for (const cat of CATEGORIES) {
      for (const site of DEFAULT_PRESET_SITES[cat]!) {
        expect(site).toBeTruthy();
        expect(typeof site).toBe("string");
      }
    }
  });
});

describe("DEFAULT_QUOTES", () => {
  it("has quotes for every category", () => {
    for (const cat of CATEGORIES) {
      expect(DEFAULT_QUOTES[cat]!).toBeDefined();
      expect(Array.isArray(DEFAULT_QUOTES[cat]!)).toBe(true);
    }
  });

  it("each category has at least 5 default quotes", () => {
    for (const cat of CATEGORIES) {
      expect(
        DEFAULT_QUOTES[cat]!.length,
        `${cat} should have at least 5 quotes`,
      ).toBeGreaterThanOrEqual(5);
    }
  });

  it("each quote has an id, text, and author field", () => {
    for (const cat of CATEGORIES) {
      for (const quote of DEFAULT_QUOTES[cat]!) {
        expect(quote.id).toBeTruthy();
        expect(typeof quote.id).toBe("string");
        expect(quote.text).toBeTruthy();
        expect(typeof quote.text).toBe("string");
        expect(typeof quote.author).toBe("string");
      }
    }
  });

  it("each quote id is unique within its category", () => {
    for (const cat of CATEGORIES) {
      const ids = DEFAULT_QUOTES[cat]!.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });

  it("quotes are category-relevant", () => {
    for (const cat of CATEGORIES) {
      for (const quote of DEFAULT_QUOTES[cat]!) {
        expect(quote.id).toMatch(new RegExp(`^${cat}-`));
      }
    }
  });
});
