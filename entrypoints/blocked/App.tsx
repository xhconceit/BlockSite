import { useState, useEffect } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { useI18n } from "../../hooks/useI18n";
import { CATEGORY_INFO } from "../../packages/core/src";
import type { Category, QuoteItem } from "../../packages/core/src";

interface PageState {
  ruleId: string;
  category: Category;
  customMessage: string;
  blockedUrl: string;
  blockCount: number;
  themeColor: string;
  unlocked: boolean;
  unlockUntil: number | null;
  warning: boolean;
  quote: QuoteItem | undefined;
  remainingUnlocks: number;
}

function getQuotes(
  t: (key: string, substitutions?: (string | number)[]) => string,
  category: string,
): QuoteItem[] {
  const quotes: QuoteItem[] = [];
  for (let i = 1; i <= 5; i++) {
    const text = t(`quote_${category}_${i}`);
    if (text && text !== `quote_${category}_${i}`) {
      quotes.push({ id: String(i), text, author: "" });
    }
  }
  return quotes.length > 0 ? quotes : [{ id: "1", text: t("blocked_defaultQuote"), author: "" }];
}

export default function App() {
  const { t } = useI18n();
  const [state, setState] = useState<PageState | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState("");
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    initPage();
  }, []);

  useEffect(() => {
    if (!state?.unlockUntil) return;
    const timer = setInterval(() => {
      const remaining = state.unlockUntil! - Date.now();
      if (remaining <= 0) {
        setState((prev) => (prev ? { ...prev, unlocked: false, unlockUntil: null } : null));
        clearInterval(timer);
      } else {
        const m = Math.floor(remaining / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setCountdown(`${m}:${s.toString().padStart(2, "0")}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [state?.unlockUntil]);

  async function initPage() {
    const params = new URLSearchParams(window.location.search);
    const ruleId = params.get("ruleId") || "";
    const category = (params.get("category") || "custom") as Category;
    const customMessage = params.get("customMessage") || "";

    const info = CATEGORY_INFO[category] ?? CATEGORY_INFO["custom"]!;
    const quotes = getQuotes(t, category);
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    try {
      const [urlResp, checkResp] = await Promise.all([
        chrome.runtime.sendMessage({ type: "getBlockedUrl" }),
        chrome.runtime.sendMessage({ type: "checkUnlock", category }),
      ]);

      setState({
        ruleId,
        category,
        customMessage: decodeURIComponent(customMessage),
        blockedUrl: (urlResp as { url: string })?.url || "",
        blockCount: 0,
        themeColor: info.themeColor,
        unlocked: (checkResp as { active: boolean })?.active || false,
        unlockUntil: (checkResp as { until: number | null })?.until || null,
        warning: (checkResp as { warning: boolean })?.warning || false,
        quote,
        remainingUnlocks: (checkResp as { remainingUnlocks?: number })?.remainingUnlocks ?? 0,
      });
    } catch {
      setState({
        ruleId,
        category,
        customMessage: decodeURIComponent(customMessage),
        blockedUrl: "",
        blockCount: 0,
        themeColor: info.themeColor,
        unlocked: false,
        unlockUntil: null,
        warning: false,
        quote,
        remainingUnlocks: 0,
      });
    }

    chrome.runtime
      .sendMessage({
        type: "blockPageOpened",
        ruleId,
        category,
      })
      .catch(() => {});
  }

  async function handleUnlock() {
    if (!state) return;
    try {
      const resp = await chrome.runtime.sendMessage({
        type: "unlock",
        category: state.category,
        password,
      });

      if (resp.success) {
        setState((prev) =>
          prev
            ? {
                ...prev,
                unlocked: true,
                unlockUntil: resp.until,
                remainingUnlocks: Math.max(0, prev.remainingUnlocks - 1),
              }
            : null,
        );
        setError("");
        setTimeout(() => {
          window.location.href = state.blockedUrl || "about:blank";
        }, 300);
      } else {
        setError(resp.error || t("blocked_incorrectPassword"));
      }
    } catch {
      setError(t("blocked_failedToUnlock"));
    }
  }

  async function handleExtend() {
    if (!state) return;
    setExtending(true);
    try {
      const resp = await chrome.runtime.sendMessage({
        type: "extendUnlock",
        category: state.category,
        password,
        additionalMinutes: 5,
      });
      if (resp.success) {
        setState((prev) => (prev ? { ...prev, unlockUntil: resp.until } : null));
      }
    } catch {
      /* ignore */
    }
    setExtending(false);
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-lime-300 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const catLabel = t(`category_${state.category}`);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Category glow */}
      <div
        className="absolute inset-0 opacity-[0.08] animate-pulse"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${state.themeColor} 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 w-full max-w-md space-y-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Icon */}
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{
              background: `linear-gradient(135deg, ${state.themeColor}30, ${state.themeColor}10)`,
              border: `1px solid ${state.themeColor}30`,
            }}
          >
            <svg
              className="w-10 h-10"
              style={{ color: state.themeColor }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-100 mb-1">{t("blocked_title")}</h1>
          <Badge color={state.themeColor}>{catLabel}</Badge>
        </div>

        {/* URL */}
        {state.blockedUrl && (
          <p className="text-center text-sm text-zinc-600 font-mono break-all px-4">
            {state.blockedUrl}
          </p>
        )}

        {/* Quote */}
        <div
          className="rounded-2xl p-6 text-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${state.themeColor}15, ${state.themeColor}05)`,
            border: `1px solid ${state.themeColor}20`,
          }}
        >
          <p className="text-base font-medium leading-relaxed" style={{ color: state.themeColor }}>
            {state.customMessage || state.quote?.text || t("blocked_defaultQuote")}
          </p>
          {!state.customMessage && state.quote?.author ? (
            <p className="text-sm text-zinc-600 mt-3">— {state.quote.author}</p>
          ) : null}
        </div>

        {/* Unlock */}
        {!state.unlocked ? (
          <div className="space-y-3">
            <Input
              type="password"
              placeholder={t("blocked_passwordPlaceholder")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUnlock();
              }}
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm flex items-center gap-1">
                <span>!</span> {error}
              </p>
            )}
            <Button
              className="w-full"
              style={{ background: state.themeColor, color: "#18181b" }}
              onClick={handleUnlock}
              disabled={!password}
            >
              {t("blocked_unlock")}
            </Button>
            <p className="text-center text-xs text-zinc-600">
              {t("blocked_unlocksRemaining", [String(state.remainingUnlocks)])}
            </p>
          </div>
        ) : (
          /* Active unlock */
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-400/10 border border-green-400/20">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-sm font-medium">{t("blocked_unlocked")}</span>
            </div>
            {countdown && <p className="text-3xl font-mono font-bold text-zinc-100">{countdown}</p>}
            {state.warning && (
              <div className="space-y-2">
                <p className="text-amber-400 text-sm">{t("blocked_expiresSoon")}</p>
                <Button variant="outline" size="sm" onClick={handleExtend} disabled={extending}>
                  {extending ? t("blocked_extending") : t("blocked_extend")}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-zinc-700">{t("blocked_footer")}</p>
      </div>
    </div>
  );
}
