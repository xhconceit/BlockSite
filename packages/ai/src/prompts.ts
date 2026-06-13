import type { Category, BlockedItem, DailyStats } from "@blocksite/core";
import { CATEGORIES } from "@blocksite/core";

const BLOCKSITE_SYSTEM_PROMPT = `You are an AI assistant integrated into BlockSite, a Chrome browser extension that helps users block distracting websites and stay focused.

## About BlockSite Categories
BlockSite organizes blocked sites into these categories:
- social: Social media (facebook, twitter, instagram, tiktok, reddit, weibo, etc.)
- video: Video/streaming (youtube, netflix, bilibili, twitch, hulu, etc.)
- game: Gaming (steam, epic games, roblox, minecraft, etc.)
- news: News/forums (hacker news, reddit, digg, etc.)
- shopping: Online shopping (amazon, taobao, jd, ebay, etc.)
- adult: Adult content
- custom: User-defined category for anything not fitting above

## Output Instructions
Always respond with valid JSON only. Do not include markdown code fences or any text outside the JSON object. The exact JSON schema varies by task — follow the user's instructions precisely.`;

// ── Categorize Site ──

export function categorizeSitePrompt(siteUrl: string): {
  system: string;
  user: string;
} {
  return {
    system: BLOCKSITE_SYSTEM_PROMPT,
    user: `Categorize this website into the most appropriate BlockSite category.

Website URL: "${siteUrl}"

Return a JSON object with:
- "category": one of ${CATEGORIES.map((c) => `"${c}"`).join(", ")}
- "confidence": a number 0-1 indicating how confident you are
- "reasoning": a short explanation (one sentence)

Example output:
{"category":"social","confidence":0.95,"reasoning":"Twitter is a major social media platform."}`,
  };
}

// ── Generate Quote ──

export function generateQuotePrompt(
  category: Category,
  blockCount: number,
): {
  system: string;
  user: string;
} {
  return {
    system: BLOCKSITE_SYSTEM_PROMPT,
    user: `Generate a short motivational quote to display when a user tries to visit a blocked "${category}" website.

Context:
- The user has been blocked ${blockCount} ${blockCount === 1 ? "time" : "times"} today from ${category} sites.
- The quote should be encouraging, witty, or thought-provoking — NOT shaming or negative.
- Keep it to 1-2 short sentences.
- Write in English.

Return a JSON object with just "text" and "author" fields:
{"text":"The quote text here.","author":"Attribution or empty string if original"}`,
  };
}

// ── Parse Natural Language Rule ──

export function parseNLRulePrompt(
  nlInput: string,
  existingRules: BlockedItem[],
): {
  system: string;
  user: string;
} {
  const existingSummary =
    existingRules.length > 0
      ? existingRules
          .map(
            (r) =>
              `- ${r.type}:"${r.value}" (category: ${r.category}, enabled: ${String(r.enabled)})`,
          )
          .join("\n")
      : "(no existing rules)";

  return {
    system: BLOCKSITE_SYSTEM_PROMPT,
    user: `A user wants to block websites using natural language. Parse their request into structured rules.

User request: "${nlInput}"

Current existing rules:
${existingSummary}

Rules can be:
- "domain" type: blocks an entire domain (e.g., "facebook.com") — strip www, http://, https:// prefixes
- "keyword" type: blocks URLs containing a keyword (use sparingly, only when user explicitly wants keyword blocking)

Categories: ${CATEGORIES.join(", ")}

Return a JSON object with:
- "rules": array of { "type": "domain" | "keyword", "value": string, "category": Category, "enabled": boolean }
- "explanation": a brief summary of what you created and why

CRITICAL: Be COMPREHENSIVE. Generate rules for ALL well-known websites that match the user's intent, not just the ones they named. For example:
- If they say "block social media", include facebook.com, twitter.com, instagram.com, tiktok.com, reddit.com, snapchat.com, linkedin.com, pinterest.com, tumblr.com, weibo.com, vk.com, x.com, threads.net, mastodon.social, bluesky.social and other major social platforms
- If they say "block video sites", include youtube.com, netflix.com, bilibili.com, twitch.tv, vimeo.com, dailymotion.com, hulu.com, disneyplus.com, primevideo.com, iqiyi.com, youku.com
- If they say "block games", include steam.com, epicgames.com, roblox.com, minecraft.net, ea.com, battle.net, riotgames.com, nintendo.com
- If they say "block news/forums", include reddit.com, news.ycombinator.com, medium.com, quora.com, digg.com, slashdot.org

Use your knowledge of the global internet to generate as many relevant domains as possible. Do NOT suggest rules that duplicate existing rules. If the request is vague or unclear, ask for clarification in the explanation field and return an empty rules array.`,
  };
}

// ── Classify URL (Smart Blocking) ──

export function classifyUrlPrompt(
  url: string,
  title: string,
  descriptions: string[],
  content?: string,
): { system: string; user: string } {
  const intentList = descriptions.map((d, i) => `${i + 1}. "${d}"`).join("\n");
  const contentBlock = content
    ? `\nPage content excerpt:\n"""\n${content.slice(0, 1500)}\n"""\n`
    : "";

  return {
    system: BLOCKSITE_SYSTEM_PROMPT,
    user: `A user has set up smart blocking rules using natural language. Check if the current website matches any of these blocking intents.

Website URL: "${url}"
Page title: "${title}"${contentBlock}
User's blocking intents:
${intentList}

Analyze the URL, title${content ? ", and page content" : ""} to determine if this website should be blocked based on the user's intents. Be strict — only block if the website CLEARLY matches the intent.

Return JSON:
{"blocked": true|false, "matchedIntent": "the intent that matched (empty if not blocked)", "category": "social|video|game|news|shopping|adult|custom", "reason": "one sentence explanation"}

Example:
{"blocked":true,"matchedIntent":"block all social media","category":"social","reason":"Twitter is a social media platform."}
{"blocked":false,"matchedIntent":"","category":"custom","reason":"This website does not match any blocking intent."}`,
  };
}

// ── Analyze Stats ──

export function analyzeStatsPrompt(
  dailyStats: DailyStats[],
  rules: BlockedItem[],
): {
  system: string;
  user: string;
} {
  const statsSummary = dailyStats
    .map(
      (d) =>
        `Date ${d.date}: ${d.totalBlocks} total blocks, categories: ${JSON.stringify(d.byCategory)}, hourly pattern: ${JSON.stringify(d.byHour)}`,
    )
    .join("\n");

  const rulesSummary = rules
    .filter((r) => r.enabled)
    .map((r) => `- ${r.category}/${r.value} (${r.type})`)
    .join("\n");

  return {
    system: BLOCKSITE_SYSTEM_PROMPT,
    user: `Analyze this user's website blocking statistics and provide actionable insights.

## Blocking Stats
${statsSummary || "(no data yet)"}

## Active Rules
${rulesSummary || "(no active rules)"}

Return a JSON object with:
- "insights": array of { "title": string, "description": string, "severity": "info" | "warning" | "suggestion", "actionable": boolean }
- "summary": a 1-2 sentence overall summary of the user's blocking patterns

Provide up to 5 insights. Focus on:
1. Peak distraction hours (when blocks happen most)
2. Most problematic categories
3. Recommendations for schedule adjustments
4. Categories that might need more/less rules
5. Positive trends (if blocks are decreasing)

Be encouraging and constructive, not judgmental. If there's very little data, note that in the summary.`,
  };
}
