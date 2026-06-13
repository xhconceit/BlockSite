import type { Category } from "@blocksite/core";

export type AIProvider = "anthropic" | "openai" | "ollama" | "openrouter" | "deepseek";

export interface ApiKeyRecord {
  provider: AIProvider;
  key: string;
  baseUrl?: string;
  model?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CategorizationResult {
  category: Category;
  confidence: number;
  reasoning: string;
}

export interface ParsedRule {
  type: "domain" | "keyword";
  value: string;
  category: Category;
  enabled: boolean;
}

export interface NLParsedRules {
  rules: ParsedRule[];
  explanation: string;
}

export interface StatsInsight {
  title: string;
  description: string;
  severity: "info" | "warning" | "suggestion";
  actionable: boolean;
}

export interface StatsAnalysis {
  insights: StatsInsight[];
  summary: string;
}

export interface ProviderInfo {
  key: AIProvider;
  name: string;
  description: string;
  requiresBaseUrl: boolean;
  defaultModel: string;
  models: string[];
}

export class MissingApiKeyError extends Error {
  constructor(provider: AIProvider) {
    super(`No API key configured for ${provider}. Please add one in Options > AI.`);
    this.name = "MissingApiKeyError";
  }
}

export class AIProviderError extends Error {
  constructor(
    public statusCode: number,
    provider: string,
    responseBody: string,
  ) {
    super(`AI provider error (${provider}, status ${statusCode}): ${responseBody}`);
    this.name = "AIProviderError";
  }
}

export interface AICallLog {
  id: string;
  timestamp: number;
  provider: AIProvider;
  feature: string;
  input: string;
  output: string;
  success: boolean;
}

export class AIParseError extends Error {
  constructor(feature: string, details: string) {
    super(`Failed to parse AI response for ${feature}: ${details}`);
    this.name = "AIParseError";
  }
}
