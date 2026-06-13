import { settings } from "@blocksite/storage";
import type { AIProvider } from "./types";
import { PROVIDER_INFO_LIST } from "./constants";

export async function getAIConfig(): Promise<{
  provider: AIProvider;
  model: string;
}> {
  const prefs = (await settings.get("aiFeatures")) as
    | { provider?: AIProvider; model?: string }
    | undefined;

  const provider = prefs?.provider ?? "anthropic";
  const info = PROVIDER_INFO_LIST.find((p) => p.key === provider);
  const model = prefs?.model ?? info?.defaultModel ?? "claude-sonnet-4-5";

  return { provider, model };
}
