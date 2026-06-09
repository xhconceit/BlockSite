import { useState, useEffect } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
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

const DEFAULT_QUOTES: Record<string, QuoteItem[]> = {
  social: [
    { id: "1", text: "真正的朋友不在屏幕里", author: "" },
    { id: "2", text: "你刷走的不是时间，是机会", author: "" },
    { id: "3", text: "社交媒体的算法比你更了解你的弱点", author: "" },
    { id: "4", text: "点赞不会让你更快乐，专注会让你更充实", author: "" },
    { id: "5", text: "别人的人生精选集不等于你的日常", author: "" },
  ],
  video: [
    { id: "1", text: "看完这个视频你什么也不会改变", author: "" },
    { id: "2", text: "算法的尽头不是充实，是空虚", author: "" },
    { id: "3", text: "下一个视频不会更好", author: "" },
    { id: "4", text: "真正的好内容值得搜索，不是被推送", author: "" },
    { id: "5", text: "Binge-watching 不是休息，是逃避", author: "" },
  ],
  game: [
    { id: "1", text: "通关的人生不在游戏里", author: "" },
    { id: "2", text: "每局 20 分钟，一年就是 120 小时", author: "" },
    { id: "3", text: "游戏里的成就不会出现在你的简历上", author: "" },
    { id: "4", text: "延迟满足是成年人最重要的能力", author: "" },
    { id: "5", text: "打完这一把，你也不会变得更好", author: "" },
  ],
  news: [
    { id: "1", text: "99% 的新闻和你无关", author: "" },
    { id: "2", text: "信息焦虑不会让你更博学", author: "" },
    { id: "3", text: "真正的深度来自书籍，不是碎片信息", author: "" },
    { id: "4", text: "24 小时新闻是注意力的工业污染", author: "" },
    { id: "5", text: "少看新闻，多读历史", author: "" },
  ],
  adult: [
    { id: "1", text: "这不是你真正需要的", author: "" },
    { id: "2", text: "你值得更健康的娱乐方式", author: "" },
    { id: "3", text: "短暂的刺激不会带来持久的满足", author: "" },
    { id: "4", text: "真正的亲密不在屏幕里", author: "" },
    { id: "5", text: "尊重自己，也尊重他人", author: "" },
  ],
  custom: [
    { id: "1", text: "保持专注，你可以做到", author: "" },
    { id: "2", text: "每一次克制都是进步", author: "" },
    { id: "3", text: "你的未来由专注的此刻构成", author: "" },
    { id: "4", text: "拖延的每一分钟都是你在欠自己", author: "" },
    { id: "5", text: "先完成，再放松", author: "" },
  ],
};

export default function App() {
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

    const info = CATEGORY_INFO[category];
    const quotes = DEFAULT_QUOTES[category] || DEFAULT_QUOTES.custom!;
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
        remainingUnlocks: 5,
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
        remainingUnlocks: 5,
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
        setState((prev) => (prev ? { ...prev, unlocked: true, unlockUntil: resp.until } : null));
        setError("");
        setTimeout(() => {
          window.location.href = state.blockedUrl || "about:blank";
        }, 300);
      } else {
        setError(resp.error || "Incorrect password");
      }
    } catch {
      setError("Failed to unlock");
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

  const info = CATEGORY_INFO[state.category];

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
          <h1 className="text-xl font-bold text-zinc-100 mb-1">Site Blocked</h1>
          <Badge color={state.themeColor}>{info.label}</Badge>
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
            {state.customMessage || state.quote?.text || "Stay focused."}
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
              placeholder="Enter password to unlock temporarily"
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
              Unlock
            </Button>
            <p className="text-center text-xs text-zinc-600">
              {state.remainingUnlocks} unlocks remaining today
            </p>
          </div>
        ) : (
          /* Active unlock */
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-400/10 border border-green-400/20">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-sm font-medium">Unlocked</span>
            </div>
            {countdown && <p className="text-3xl font-mono font-bold text-zinc-100">{countdown}</p>}
            {state.warning && (
              <div className="space-y-2">
                <p className="text-amber-400 text-sm">Unlock expires soon</p>
                <Button variant="outline" size="sm" onClick={handleExtend} disabled={extending}>
                  {extending ? "Extending..." : "Extend 5 minutes"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-zinc-700">BlockSite · Stay focused</p>
      </div>
    </div>
  );
}
