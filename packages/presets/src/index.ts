import type { QuoteItem } from "@blocksite/core";
import { DEFAULT_PRESET_SITES, DEFAULT_QUOTES } from "@blocksite/core";
import { presets as presetsRepo } from "@blocksite/storage";

export async function getSites(category: string): Promise<string[]> {
  const sites = await presetsRepo.getSites(category);
  if (sites.length === 0) {
    return [...(DEFAULT_PRESET_SITES[category] ?? [])];
  }
  return sites;
}

export async function addSite(category: string, site: string): Promise<void> {
  const sites = await presetsRepo.getSites(category);
  const all = sites.length === 0 ? [...(DEFAULT_PRESET_SITES[category] ?? [])] : sites;
  if (all.includes(site)) return;
  all.push(site);
  await presetsRepo.setSites(category, all);
}

export async function removeSite(category: string, site: string): Promise<void> {
  const sites = await presetsRepo.getSites(category);
  const all = sites.length === 0 ? [...(DEFAULT_PRESET_SITES[category] ?? [])] : sites;
  await presetsRepo.setSites(
    category,
    all.filter((s) => s !== site),
  );
}

export async function getQuotes(category: string): Promise<QuoteItem[]> {
  const quotes = await presetsRepo.getQuotes(category);
  if (quotes.length === 0) {
    return [...(DEFAULT_QUOTES[category] ?? [])];
  }
  return quotes;
}

export async function addQuote(category: string, text: string, author = ""): Promise<QuoteItem> {
  const quotes = await getQuotes(category);
  const item: QuoteItem = { id: crypto.randomUUID(), text, author };
  quotes.push(item);
  await presetsRepo.setQuotes(category, quotes);
  return item;
}

export async function editQuote(
  category: string,
  id: string,
  text: string,
  author: string,
): Promise<void> {
  const quotes = await getQuotes(category);
  const idx = quotes.findIndex((q) => q.id === id);
  if (idx === -1) return;
  quotes[idx] = { id, text, author };
  await presetsRepo.setQuotes(category, quotes);
}

export async function removeQuote(category: string, id: string): Promise<void> {
  const quotes = await getQuotes(category);
  await presetsRepo.setQuotes(
    category,
    quotes.filter((q) => q.id !== id),
  );
}

export async function getRandomQuote(category: string): Promise<QuoteItem | undefined> {
  const quotes = await getQuotes(category);
  if (quotes.length === 0) return undefined;
  const idx = Math.floor(Math.random() * quotes.length);
  return quotes[idx];
}

export async function resetSitesToDefault(category: string): Promise<void> {
  await presetsRepo.setSites(category, [...(DEFAULT_PRESET_SITES[category] ?? [])]);
}

export async function resetQuotesToDefault(category: string): Promise<void> {
  await presetsRepo.setQuotes(category, [...(DEFAULT_QUOTES[category] ?? [])]);
}
