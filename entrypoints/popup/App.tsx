import { useState, useEffect } from "react";
import { Button } from "../../components/ui/Button";
import { Toggle } from "../../components/ui/Toggle";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { CATEGORY_INFO } from "../../packages/core/src";
import type { BlockedItem, AppConfig, CategoryInfo } from "../../packages/core/src";
import { useI18n } from "../../hooks/useI18n";
import { ToastContainer, showToast } from "../../components/ui/Toast";

interface PopupState {
  config: AppConfig;
  rules: BlockedItem[];
  todayBlocks: number;
  activeRules: number;
  currentUrl: string;
  categories: Record<string, CategoryInfo>;
}

export default function App() {
  const { t } = useI18n();
  const [state, setState] = useState<PopupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quickAddCategory, setQuickAddCategory] = useState<string>("custom");
  const [quickAddMessage, setQuickAddMessage] = useState("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    loadState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadState() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: "getConfig" });
      if (resp?.error) throw new Error(resp.error);
      const tab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      const url = tab?.url || "";
      const hostname = url ? new URL(url).hostname.replace(/^www\./, "") : "";
      const statsResp = await chrome.runtime.sendMessage({
        type: "getStats",
        from: new Date().toISOString().split("T")[0]!,
        to: new Date().toISOString().split("T")[0]!,
      });
      const rules = resp.rules || [];
      setState({
        config: resp.config || { enabled: true, autoRecoverMinutes: 30, locale: "auto" },
        rules,
        todayBlocks: statsResp?.today || 0,
        activeRules: rules.filter((r: BlockedItem) => r.enabled).length,
        currentUrl: hostname,
        categories: (resp?.categories as Record<string, CategoryInfo>) ?? {},
      });
      setError("");
    } catch (err) {
      console.error("[Popup]", err);
      setError(t("popup_loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(enabled: boolean) {
    try {
      await chrome.runtime.sendMessage({ type: "toggleEnabled", enabled });
      setState((prev) => (prev ? { ...prev, config: { ...prev.config, enabled } } : null));
    } catch (err) {
      console.error("[Popup] Toggle failed:", err);
    }
  }

  async function handleQuickAdd() {
    if (!state?.currentUrl) return;
    if (state.rules.some((r) => r.type === "domain" && r.value === state.currentUrl)) {
      showToast(t("popup_alreadyBlockedDetail"), "info");
      return;
    }
    setAdding(true);
    const item: BlockedItem = {
      id: crypto.randomUUID(),
      type: "domain",
      value: state.currentUrl,
      enabled: true,
      category: quickAddCategory,
      customMessage: quickAddMessage.trim(),
      order: state.rules.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await chrome.runtime.sendMessage({ type: "updateRules", items: [...state.rules, item] });
      setState((prev) => (prev ? { ...prev, rules: [...prev.rules, item] } : null));
      setQuickAddMessage("");
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error("[Popup] Quick add failed:", err);
      setError(t("popup_loadFailed"));
    } finally {
      setAdding(false);
    }
  }

  function catInfo(key: string): CategoryInfo {
    return state?.categories?.[key] ?? CATEGORY_INFO[key] ?? CATEGORY_INFO["custom"]!;
  }

  const categoryOptions = Object.entries(state?.categories ?? {}).map(([key]) => ({
    value: key,
    label: t(`category_${key}`),
  }));

  if (loading) {
    return (
      <div className="w-[360px] h-[500px] bg-zinc-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-lime-300 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">{t("common_loading")}</p>
        </div>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="w-[360px] h-[500px] bg-zinc-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-red-400 mb-3 text-4xl">!</div>
          <p className="text-zinc-300 text-sm mb-4">{error}</p>
          <Button
            size="sm"
            onClick={() => {
              setError("");
              setLoading(true);
              loadState();
            }}
          >
            {t("common_retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!state) return null;

  const alreadyBlocked = state.rules.some(
    (r) => r.type === "domain" && r.value === state.currentUrl,
  );

  return (
    <div className="w-[360px] h-[500px] bg-zinc-900 text-zinc-100 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-lime-300 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-zinc-900"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">{t("popup_title")}</h1>
            <p className="text-xs text-zinc-500">
              {t("popup_blocksToday", [String(state.todayBlocks)])}
            </p>
          </div>
        </div>
        <Toggle checked={state.config.enabled} onCheckedChange={handleToggle} label="Toggle" />
      </header>

      <div className="grid grid-cols-3 gap-0.5 px-4 py-2.5 border-b border-zinc-800 shrink-0">
        <div className="text-center">
          <p className="text-lg font-bold text-lime-300">{state.activeRules}</p>
          <p className="text-[10px] text-zinc-500">{t("popup_activeRules")}</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-zinc-200">{state.todayBlocks}</p>
          <p className="text-[10px] text-zinc-500">
            {t("popup_blocksToday", [String(state.todayBlocks)])}
          </p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-zinc-200">{state.rules.length}</p>
          <p className="text-[10px] text-zinc-500">{t("popup_totalRules")}</p>
        </div>
      </div>

      <div className="p-4 border-b border-zinc-800 shrink-0">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
          {t("popup_currentSite")}
        </p>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-lime-300 shrink-0" />
          <p className="text-sm font-mono text-zinc-200 truncate">
            {state.currentUrl || t("popup_noSite")}
          </p>
        </div>
        {!state.currentUrl ? (
          <p className="text-xs text-zinc-600">{t("popup_openSite")}</p>
        ) : alreadyBlocked ? (
          <div className="flex items-center gap-2">
            <Badge
              color={
                catInfo(
                  state.rules.find((r) => r.type === "domain" && r.value === state.currentUrl)
                    ?.category ?? "custom",
                ).themeColor
              }
            >
              {t("popup_alreadyBlocked")}
            </Badge>
          </div>
        ) : (
          <div className="space-y-2">
            <Select
              options={
                categoryOptions.length > 0
                  ? categoryOptions
                  : Object.entries(CATEGORY_INFO).map(([k]) => ({
                      value: k,
                      label: t(`category_${k}`),
                    }))
              }
              value={quickAddCategory}
              onChange={(e) => setQuickAddCategory(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder={t("popup_customMessage")}
              value={quickAddMessage}
              onChange={(e) => setQuickAddMessage(e.target.value)}
            />
            <Button className="w-full" size="sm" onClick={handleQuickAdd} disabled={adding}>
              {adding ? t("popup_adding") : added ? t("popup_blocked") : t("popup_blockThisSite")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
          {t("popup_blockedSites", [String(state.rules.length)])}
        </p>
        {state.rules.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-6">{t("popup_noSites")}</p>
        ) : (
          <div className="space-y-1">
            {state.rules.slice(0, 20).map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-800/50 transition-colors group"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: catInfo(rule.category).themeColor }}
                />
                <span className="text-sm font-mono text-zinc-300 truncate flex-1">
                  {rule.value}
                </span>
                <Badge color={catInfo(rule.category).themeColor}>
                  {t(`category_${rule.category}`)}
                </Badge>
                {!rule.enabled && (
                  <span className="text-[10px] text-zinc-600">{t("popup_paused")}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="flex border-t border-zinc-800 shrink-0">
        <button
          className="flex-1 py-2.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-center"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          {t("common_settings")}
        </button>
        <button
          className="flex-1 py-2.5 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors text-center border-l border-zinc-800"
          onClick={() => {
            chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
          }}
        >
          {t("common_dashboard")}
        </button>
      </footer>
      <ToastContainer />
    </div>
  );
}
