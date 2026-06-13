import { useState, useEffect } from "react";
import { useI18n } from "../../hooks/useI18n";
import { CATEGORY_INFO } from "../../packages/core/src";
import type { Category } from "../../packages/core/src";
import type { StatsAnalysis, StatsInsight } from "../../packages/ai/src";

interface DashData {
  today: number;
  total: number;
  categories: Record<Category, number>;
  hourly: Record<number, number>;
  ranking: { ruleId: string; count: number }[];
  trend: { changePercent: number } | null;
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function App() {
  const { t } = useI18n();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<StatsAnalysis | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (data !== null) {
      loadInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function loadInsights() {
    setInsightsLoading(true);
    try {
      const today = fmt(new Date());
      const weekAgo = fmt(new Date(Date.now() - 7 * 86400000));
      const result = (await chrome.runtime.sendMessage({
        type: "ai:analyzeStats",
        from: weekAgo,
        to: today,
      })) as StatsAnalysis;
      if (result?.insights) {
        setInsights(result);
      }
    } catch {
      /* AI not configured — silently skip */
    } finally {
      setInsightsLoading(false);
    }
  }

  async function loadData() {
    try {
      const today = fmt(new Date());
      const weekAgo = fmt(new Date(Date.now() - 7 * 86400000));
      const prev = fmt(new Date(Date.now() - 14 * 86400000));

      const resp = await chrome.runtime.sendMessage({
        type: "getStats",
        from: weekAgo,
        to: today,
        prevFrom: prev,
        prevTo: weekAgo,
      });
      setData(resp);
    } catch (err) {
      console.error("[Dashboard]", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-lime-300 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-sm">{t("dashboard_loading")}</p>
        </div>
      </div>
    );
  }

  const maxHourly = Math.max(...Object.values(data?.hourly || {}), 1);

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{t("dashboard_title")}</h1>
          <p className="text-sm text-zinc-500 mt-1">{t("dashboard_desc")}</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <Card label={t("dashboard_today")} value={String(data?.today ?? 0)} color="#60A5FA" />
          <Card
            label={t("dashboard_totalBlocks")}
            value={String(data?.total ?? 0)}
            color="#4ADE80"
          />
          <Card label={t("dashboard_activeRules")} value="—" color="#FBBF24" />
          <Card
            label={t("dashboard_vsLastWeek")}
            value={
              data?.trend
                ? `${data.trend.changePercent > 0 ? "+" : ""}${data.trend.changePercent}%`
                : "—"
            }
            color={data?.trend && data.trend.changePercent > 0 ? "#F87171" : "#4ADE80"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Category breakdown */}
          <Panel title={t("dashboard_byCategory")}>
            {data?.categories ? (
              <div className="space-y-2.5">
                {Object.entries(data.categories).map(([cat, pct]) => {
                  const info = CATEGORY_INFO[cat] ?? CATEGORY_INFO["custom"]!;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-sm text-zinc-400 w-16 shrink-0">
                        {t(`category_${cat}`)}
                      </span>
                      <div className="flex-1 h-5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            backgroundColor: info.themeColor,
                          }}
                        />
                      </div>
                      <span className="text-sm text-zinc-500 w-9 text-right tabular-nums">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty t={t} />
            )}
          </Panel>

          {/* Hourly heatmap */}
          <Panel title={t("dashboard_hourlyDist")}>
            <div className="flex items-end gap-[2px] h-36">
              {Array.from({ length: 24 }, (_, h) => {
                const count = data?.hourly?.[h] ?? 0;
                const height = (count / maxHourly) * 100;
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                      {count}
                    </span>
                    <div
                      className="w-full rounded-t transition-all duration-500"
                      style={{
                        height: `${Math.max(height, 1)}%`,
                        backgroundColor: count > 0 ? "#818CF8" : "#27272A",
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-zinc-600">0:00</span>
              <span className="text-[10px] text-zinc-600">12:00</span>
              <span className="text-[10px] text-zinc-600">23:00</span>
            </div>
          </Panel>

          {/* Rule ranking */}
          <Panel title={t("dashboard_topRules")}>
            {data?.ranking && data.ranking.length > 0 ? (
              <div className="space-y-0.5">
                {data.ranking.slice(0, 8).map((item, i) => (
                  <div
                    key={item.ruleId}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
                  >
                    <span
                      className={`text-xs font-bold w-5 tabular-nums ${i < 3 ? "text-lime-300" : "text-zinc-600"}`}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-mono text-zinc-300 truncate">
                      {item.ruleId.slice(0, 12)}...
                    </span>
                    <span className="text-sm text-zinc-400 tabular-nums">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty t={t} />
            )}
          </Panel>

          {/* Trend */}
          <Panel title={t("dashboard_trend")}>
            {data?.trend ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div
                    className={`text-4xl font-bold ${data.trend.changePercent > 0 ? "text-red-400" : "text-green-400"}`}
                  >
                    {data.trend.changePercent > 0 ? "+" : ""}
                    {data.trend.changePercent}%
                  </div>
                  <p className="text-sm text-zinc-500 mt-2">
                    {data.trend.changePercent > 0
                      ? t("dashboard_moreBlocks")
                      : data.trend.changePercent < 0
                        ? t("dashboard_fewerBlocks")
                        : t("dashboard_sameBlocks")}
                  </p>
                </div>
              </div>
            ) : (
              <Empty t={t} />
            )}
          </Panel>
        </div>

        {/* AI Insights */}
        {(insights !== null || insightsLoading) && (
          <div className="mt-5">
            <Panel title={t("dashboard_aiInsights")}>
              {insightsLoading ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-4 h-4 border-2 border-lime-300 border-t-transparent rounded-full animate-spin" />
                  <span className="text-zinc-500 text-sm">{t("dashboard_aiAnalyzing")}</span>
                </div>
              ) : insights ? (
                <div className="space-y-3">
                  {insights.summary && (
                    <p className="text-sm text-zinc-400 mb-3">{insights.summary}</p>
                  )}
                  {insights.insights.map((insight, i) => (
                    <InsightCard key={i} insight={insight} />
                  ))}
                </div>
              ) : null}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-800/30 p-4 hover:border-zinc-700 transition-colors">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-800/20 p-5">
      <h3 className="text-sm font-medium text-zinc-400 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
      {t("dashboard_noData")}
    </div>
  );
}

function InsightCard({ insight }: { insight: StatsInsight }) {
  const severityColors: Record<string, string> = {
    info: "bg-blue-400/10 border-blue-400/20 text-blue-400",
    warning: "bg-amber-400/10 border-amber-400/20 text-amber-400",
    suggestion: "bg-lime-300/10 border-lime-300/20 text-lime-300",
  };

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${severityColors[insight.severity] ?? severityColors["info"]}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium uppercase tracking-wider opacity-70">
          {insight.severity}
        </span>
        {insight.actionable && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800/50">
            {t("dashboard_aiActionable")}
          </span>
        )}
      </div>
      <p className="text-sm font-medium">{insight.title}</p>
      <p className="text-xs mt-1 opacity-80">{insight.description}</p>
    </div>
  );
}
