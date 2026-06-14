import { useState, useEffect } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Toggle } from "../../components/ui/Toggle";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ToastContainer, showToast } from "../../components/ui/Toast";
import { Checkbox } from "../../components/ui/Checkbox";
import { Textarea } from "../../components/ui/Textarea";
import { useI18n } from "../../hooks/useI18n";
import { CATEGORY_INFO, BLOCK_TYPE_LABELS } from "../../packages/core/src";
import type { BlockedItem, BlockType, SchedulePeriod, CategoryInfo } from "../../packages/core/src";
import { PROVIDER_INFO_LIST } from "../../packages/ai/src";
import type { AIProvider, NLParsedRules } from "../../packages/ai/src";

const TAB_KEYS = [
  "rules",
  "schedule",
  "presets",
  "password",
  "categories",
  "export",
  "settings",
  "ai",
] as const;

const FEATURE_LABELS: Record<string, string> = {
  categorize: "自动分类",
  "generate-quote": "AI 名言",
  "parse-nl-rule": "NL 解析",
  "analyze-stats": "统计洞察",
  "classify-url": "智能拦截",
  "test-connection": "连接测试",
};

export default function App() {
  const [tab, setTab] = useState("rules");
  const { t } = useI18n();
  const [allCategories, setAllCategories] = useState<Record<string, CategoryInfo>>({
    ...CATEGORY_INFO,
  });

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "getConfig" }).then((resp) => {
      if (resp?.categories) {
        setAllCategories({
          ...CATEGORY_INFO,
          ...(resp.categories as Record<string, CategoryInfo>),
        });
      }
    });
  }, []);

  function refreshCategories() {
    chrome.runtime.sendMessage({ type: "getCategories" }).then((categories) => {
      if (categories) {
        setAllCategories({ ...CATEGORY_INFO, ...(categories as Record<string, CategoryInfo>) });
      }
    });
  }

  const categoryOptions = Object.entries(allCategories).map(([key]) => ({
    value: key,
    label: t(`category_${key}`),
  }));

  const tabLabels: Record<string, string> = {
    rules: t("options_tabRules"),
    schedule: t("options_tabSchedule"),
    presets: t("options_tabPresets"),
    password: t("options_tabPasswords"),
    categories: t("options_tabCategories"),
    ai: t("options_tabAI"),
    export: t("options_tabExport"),
    settings: t("options_tabSettings"),
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-lg font-bold">BlockSite</h1>
          <p className="text-xs text-zinc-500">{t("common_settings")}</p>
        </div>
        <nav className="flex-1 p-2">
          {TAB_KEYS.map((id) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                id === tab
                  ? "bg-zinc-800 text-zinc-100 font-medium"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {tabLabels[id]}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800 text-[11px] text-zinc-600">
          BlockSite v2.0.0
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl p-6">
          {tab === "rules" && (
            <RulesPanel categoryOptions={categoryOptions} categoryMap={allCategories} />
          )}
          {tab === "schedule" && <SchedulePanel />}
          {tab === "presets" && <PresetsPanel categories={allCategories} />}
          {tab === "password" && <PasswordPanel categories={allCategories} />}
          {tab === "categories" && (
            <CategoriesPanel
              categories={allCategories}
              categoryOptions={categoryOptions}
              onChanged={refreshCategories}
            />
          )}
          {tab === "ai" && <AIPanel />}
          {tab === "export" && <ExportPanel />}
          {tab === "settings" && <SettingsPanel />}
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}

// ═══ RULES PANEL ═══

function RulesPanel({
  categoryOptions,
  categoryMap,
}: {
  categoryOptions: { value: string; label: string }[];
  categoryMap: Record<string, CategoryInfo>;
}) {
  const { t } = useI18n();
  const [rules, setRules] = useState<BlockedItem[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addType, setAddType] = useState<BlockType>("domain");
  const [addValue, setAddValue] = useState("");
  const [addCat, setAddCat] = useState<string>("custom");
  const [addMsg, setAddMsg] = useState("");
  const [nlInput, setNlInput] = useState("");
  const [nlParsing, setNlParsing] = useState(false);
  const [nlResult, setNlResult] = useState<NLParsedRules | null>(null);
  const [smartRules, setSmartRules] = useState<
    { id: string; description: string; category: string; enabled: boolean }[]
  >([]);
  const [smartRulesLoaded, setSmartRulesLoaded] = useState(false);

  useEffect(() => {
    loadRules();
    loadSmartRules();
  }, []);

  async function loadSmartRules() {
    try {
      const rules = (await chrome.runtime.sendMessage({
        type: "ai:getSmartRules",
      })) as { id: string; description: string; category: string; enabled: boolean }[];
      setSmartRules(rules ?? []);
    } catch {
      /* ignore */
    }
    setSmartRulesLoaded(true);
  }

  async function loadRules() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: "getConfig" });
      setRules((resp?.rules as BlockedItem[]) || []);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }

  async function handleNlParse() {
    if (!nlInput.trim()) return;
    setNlParsing(true);
    try {
      // First, also parse into static rules for batch add
      const parsed = (await chrome.runtime.sendMessage({
        type: "ai:parseNLRule",
        nlInput: nlInput.trim(),
      })) as NLParsedRules;
      setNlResult(parsed);
    } catch {
      /* parsing failed, but we still add the smart rule below */
    }

    // Create smart rule for dynamic blocking
    try {
      const result = (await chrome.runtime.sendMessage({
        type: "ai:addSmartRule",
        rule: {
          description: nlInput.trim(),
          category: "custom",
        },
      })) as { success: boolean; rules: typeof smartRules };
      if (result?.success) {
        setSmartRules(result.rules);
        showToast(t("options_ruleAdded"), "success");
        setNlInput("");
      }
    } catch {
      showToast(t("options_aiConnectionFailed"), "error");
    } finally {
      setNlParsing(false);
    }
  }

  async function addAllNlRules(parsedRules: NLParsedRules["rules"]) {
    const newRules: BlockedItem[] = [...rules];
    let added = 0;
    for (const rule of parsedRules) {
      const exists = newRules.some((r) => r.type === rule.type && r.value === rule.value);
      if (exists) continue;
      newRules.push({
        id: crypto.randomUUID(),
        type: rule.type as BlockType,
        value: rule.value,
        enabled: rule.enabled,
        category: rule.category,
        customMessage: "",
        order: newRules.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      added++;
    }
    if (added > 0) {
      await saveRules(newRules);
      showToast(t("options_ruleAdded"), "success");
    }
    setNlInput("");
    setNlResult(null);
  }

  async function toggleSmartRule(id: string) {
    const rule = smartRules.find((r) => r.id === id);
    if (rule === undefined) return;
    const updated = smartRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    setSmartRules(updated);
    await chrome.runtime.sendMessage({
      type: "ai:toggleSmartRule",
      id,
      enabled: !rule.enabled,
    });
  }

  async function removeSmartRule(id: string) {
    const updated = smartRules.filter((r) => r.id !== id);
    setSmartRules(updated);
    await chrome.runtime.sendMessage({ type: "ai:removeSmartRule", id });
  }

  async function addNlRule(rule: {
    type: string;
    value: string;
    category: string;
    enabled: boolean;
  }) {
    const existing = rules.some((r) => r.type === rule.type && r.value === rule.value);
    if (existing) {
      showToast(t("options_duplicateRule"), "error");
      return;
    }
    const item: BlockedItem = {
      id: crypto.randomUUID(),
      type: rule.type as BlockType,
      value: rule.value,
      enabled: rule.enabled,
      category: rule.category,
      customMessage: "",
      order: rules.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveRules([...rules, item]);
    showToast(t("options_ruleAdded"), "success");
  }

  async function saveRules(items: BlockedItem[]) {
    setRules(items);
    await chrome.runtime.sendMessage({ type: "updateRules", items });
  }

  function startAdd() {
    setEditingId(null);
    setAddType("domain");
    setAddValue("");
    setAddCat("custom");
    setAddMsg("");
    setShowForm(true);
  }

  function startEdit(rule: BlockedItem) {
    setEditingId(rule.id);
    setAddType(rule.type);
    setAddValue(rule.value);
    setAddCat(rule.category);
    setAddMsg(rule.customMessage);
    setShowForm(true);
  }

  async function saveRule() {
    if (!addValue.trim()) return;
    if (editingId !== null) {
      const updated = rules.map((r) =>
        r.id === editingId
          ? {
              ...r,
              type: addType,
              value: addValue.trim(),
              category: addCat,
              customMessage: addMsg.trim(),
              updatedAt: Date.now(),
            }
          : r,
      );
      await saveRules(updated);
      showToast(t("options_ruleUpdated"), "success");
    } else {
      const trimmedValue = addValue.trim();
      if (rules.some((r) => r.type === addType && r.value === trimmedValue)) {
        showToast(t("options_duplicateRule"), "error");
        return;
      }
      const rule: BlockedItem = {
        id: crypto.randomUUID(),
        type: addType,
        value: trimmedValue,
        enabled: true,
        category: addCat,
        customMessage: addMsg.trim(),
        order: rules.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveRules([...rules, rule]);
      showToast(t("options_ruleAdded"), "success");
    }
    setShowForm(false);
    setAddValue("");
    setAddMsg("");
  }

  async function toggleRule(id: string) {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled, updatedAt: Date.now() } : r,
    );
    await saveRules(updated);
  }

  async function deleteSelected() {
    const updated = rules.filter((r) => !selected.has(r.id));
    await saveRules(updated);
    setSelected(new Set());
    showToast(t("options_ruleDeleted", [String(selected.size)]), "info");
  }

  async function deduplicateRules() {
    const seen = new Map<string, BlockedItem>();
    const duplicates: string[] = [];
    for (const r of rules) {
      const key = `${r.type}:${r.value}`;
      if (seen.has(key)) {
        duplicates.push(r.id);
      } else {
        seen.set(key, r);
      }
    }
    if (duplicates.length === 0) return;
    const updated = rules.filter((r) => !duplicates.includes(r.id));
    await saveRules(updated);
    showToast(t("options_deduplicated", [String(duplicates.length)]), "success");
  }

  const filtered = rules.filter((r) => {
    if (search && !r.value.includes(search)) return false;
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (catFilter !== "all" && r.category !== catFilter) return false;
    return true;
  });

  const allSel = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  if (!loaded) {
    return (
      <div className="flex items-center gap-3 py-8">
        <div className="w-5 h-5 border-2 border-lime-300 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-500">{t("options_loadingRules")}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("options_rulesTitle")}</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {t("options_rulesDesc", [
              String(rules.length),
              String(rules.filter((r) => r.enabled).length),
            ])}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={deduplicateRules}>
            {t("options_deduplicate")}
          </Button>
          <Button onClick={startAdd}>{t("options_addRule")}</Button>
        </div>
      </div>

      {/* NL Rules Input */}
      <div className="mb-4 p-3 rounded-xl border border-zinc-800 bg-zinc-800/20">
        <div className="flex gap-2">
          <Input
            placeholder={t("options_nlInput")}
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNlParse()}
            className="flex-1"
          />
          <Button size="sm" onClick={handleNlParse} disabled={!nlInput.trim() || nlParsing}>
            {nlParsing ? t("options_nlParsing") : t("options_nlParse")}
          </Button>
        </div>
        {nlResult !== null && (
          <div className="mt-3 space-y-1">
            {nlResult.explanation ? (
              <p className="text-xs text-zinc-500 mb-2">{nlResult.explanation}</p>
            ) : null}
            {!nlResult.rules || nlResult.rules.length === 0 ? (
              <p className="text-xs text-zinc-500">{t("options_nlNoResult")}</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500">
                    {nlResult.rules.length} rules parsed
                  </span>
                  <Button size="sm" onClick={() => addAllNlRules(nlResult.rules!)}>
                    {t("options_nlAddAll", [String(nlResult.rules.length)])}
                  </Button>
                </div>
                {nlResult.rules.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                  >
                    <span className="text-sm font-mono text-zinc-300 flex-1">
                      {r.type}:{r.value}
                    </span>
                    <Badge
                      color={
                        CATEGORY_INFO[r.category as keyof typeof CATEGORY_INFO]?.themeColor ??
                        CATEGORY_INFO["custom"]!.themeColor
                      }
                    >
                      {CATEGORY_INFO[r.category as keyof typeof CATEGORY_INFO]?.label ?? r.category}
                    </Badge>
                    <Button size="sm" variant="ghost" onClick={() => addNlRule(r)}>
                      {t("options_nlAddRule")}
                    </Button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Smart Rules List */}
      {smartRules.length > 0 && (
        <div className="mb-4 rounded-xl border border-lime-300/20 bg-lime-300/5 overflow-hidden">
          <div className="px-4 py-2 bg-lime-300/10 border-b border-lime-300/20">
            <span className="text-sm font-medium text-lime-300">{t("options_smartRules")}</span>
            <span className="text-xs text-zinc-500 ml-2">{t("options_smartRulesDesc")}</span>
          </div>
          {smartRules.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30"
            >
              <Toggle checked={r.enabled} onCheckedChange={() => toggleSmartRule(r.id)} />
              <span className="flex-1 text-sm text-zinc-300 truncate">{r.description}</span>
              <Badge
                color={
                  CATEGORY_INFO[r.category as keyof typeof CATEGORY_INFO]?.themeColor ??
                  CATEGORY_INFO["custom"]!.themeColor
                }
              >
                {CATEGORY_INFO[r.category as keyof typeof CATEGORY_INFO]?.label ?? r.category}
              </Badge>
              <button
                onClick={() => removeSmartRule(r.id)}
                className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
              >
                {t("common_remove")}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder={t("options_search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          options={[
            { value: "all", label: t("options_allTypes") },
            ...Object.keys(BLOCK_TYPE_LABELS).map((v) => ({ value: v, label: t(`ruleType_${v}`) })),
          ]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-32"
        />
        <Select
          options={[{ value: "all", label: t("options_allCategories") }, ...categoryOptions]}
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="w-36"
        />
      </div>

      {/* Batch bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <span className="text-sm text-zinc-400">
            {t("options_selected", [String(selected.size)])}
          </span>
          <Button variant="ghost" size="sm" onClick={() => {}}>
            {t("common_enable")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {}}>
            {t("common_disable")}
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteSelected}>
            {t("common_delete")}
          </Button>
        </div>
      )}

      {/* Rules list */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <label className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/30 text-sm text-zinc-400 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/50 transition-colors">
          <Checkbox
            checked={
              allSel ? true : filtered.some((r) => selected.has(r.id)) ? "indeterminate" : false
            }
            onCheckedChange={(checked) =>
              setSelected(checked ? new Set(filtered.map((r) => r.id)) : new Set())
            }
          />
          {t("options_selectAll")}
        </label>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 mb-2">
              {rules.length === 0 ? t("options_noRules") : t("options_noMatchingRules")}
            </p>
            {rules.length === 0 && (
              <Button variant="ghost" size="sm" onClick={startAdd}>
                {t("options_addFirstRule")}
              </Button>
            )}
          </div>
        ) : (
          filtered.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30 transition-colors"
            >
              <Checkbox
                checked={selected.has(rule.id)}
                onCheckedChange={(checked) => {
                  const next = new Set(selected);
                  checked ? next.add(rule.id) : next.delete(rule.id);
                  setSelected(next);
                }}
              />
              <span
                className={`flex-1 text-sm font-mono truncate ${rule.enabled ? "text-zinc-200" : "text-zinc-600"}`}
              >
                {rule.value}
              </span>
              {rule.customMessage && (
                <span className="text-xs text-zinc-600 hidden lg:inline truncate max-w-32">
                  {rule.customMessage}
                </span>
              )}
              <Badge color={(categoryMap[rule.category] ?? CATEGORY_INFO["custom"])!.themeColor}>
                {t(`category_${rule.category}`)}
              </Badge>
              <span className="text-[11px] text-zinc-600 w-14">{t(`ruleType_${rule.type}`)}</span>
              <button
                onClick={() => startEdit(rule)}
                className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors px-1"
              >
                {t("common_edit")}
              </button>
              <Toggle checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
            </div>
          ))
        )}
      </div>

      {/* Add/Edit rule modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId !== null ? t("options_editRule") : t("options_addRuleTitle")}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">{t("options_matchType")}</label>
            <Select
              options={Object.keys(BLOCK_TYPE_LABELS).map((v) => ({
                value: v,
                label: t(`ruleType_${v}`),
              }))}
              value={addType}
              onChange={(e) => setAddType(e.target.value as BlockType)}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">{t("options_value")}</label>
            <Input
              placeholder={t(`options_valuePlaceholder_${addType}`)}
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">{t("options_category")}</label>
            <Select
              options={categoryOptions}
              value={addCat}
              onChange={(e) => setAddCat(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">{t("options_customMessage")}</label>
            <Input
              placeholder={t("options_customMessagePlaceholder")}
              value={addMsg}
              onChange={(e) => setAddMsg(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1">
              {t("common_cancel")}
            </Button>
            <Button className="flex-1" onClick={saveRule} disabled={!addValue.trim()}>
              {editingId !== null ? t("common_save") : t("options_addRule")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══ SCHEDULE PANEL ═══

function SchedulePanel() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(false);
  const [periods, setPeriods] = useState<SchedulePeriod[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false); // schedule panel
  const [startH, setStartH] = useState(9);
  const [startM, setStartM] = useState(0);
  const [endH, setEndH] = useState(17);
  const [endM, setEndM] = useState(0);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const DAY_KEYS = [
    "schedule_monday",
    "schedule_tuesday",
    "schedule_wednesday",
    "schedule_thursday",
    "schedule_friday",
    "schedule_saturday",
    "schedule_sunday",
  ];

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "getConfig" }).then((resp) => {
      const s = resp?.schedule;
      if (s) {
        setEnabled(s.enabled);
        setPeriods(s.periods || []);
      }
      setLoaded(true);
    });
  }, []);

  async function save(updPeriods: SchedulePeriod[], updEnabled: boolean) {
    setPeriods(updPeriods);
    setEnabled(updEnabled);
    await chrome.runtime.sendMessage({
      type: "updateSchedule",
      schedule: {
        enabled: updEnabled,
        periods: updPeriods,
        pomodoro: { enabled: false, workMinutes: 25, breakMinutes: 5, cycles: 4 },
        exclusions: [],
      },
    });
  }

  function addPeriod() {
    const period: SchedulePeriod = {
      id: crypto.randomUUID(),
      startHour: startH,
      startMinute: startM,
      endHour: endH,
      endMinute: endM,
      days,
    };
    save([...periods, period], enabled);
    setShowAdd(false);
    showToast(t("options_periodAdded"), "success");
  }

  function removePeriod(id: string) {
    save(
      periods.filter((p) => p.id !== id),
      enabled,
    );
  }

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  if (!loaded) {
    return (
      <div className="flex items-center gap-3 py-8">
        <div className="w-5 h-5 border-2 border-lime-300 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-500">{t("options_loadingSchedule")}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("options_scheduleTitle")}</h2>
          <p className="text-sm text-zinc-500 mt-1">{t("options_scheduleDesc")}</p>
        </div>
        <Toggle
          checked={enabled}
          onCheckedChange={(v) => save(periods, v)}
          label={t("options_enableSchedule")}
        />
      </div>

      {periods.length > 0 && (
        <div className="space-y-2 mb-6">
          {periods.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30"
            >
              <span className="text-lg font-mono text-lime-300">
                {String(p.startHour).padStart(2, "0")}:{String(p.startMinute).padStart(2, "0")}
                <span className="text-zinc-600 mx-1">—</span>
                {String(p.endHour).padStart(2, "0")}:{String(p.endMinute).padStart(2, "0")}
              </span>
              <span className="text-xs text-zinc-500 flex-1">
                {DAY_KEYS.filter((_, i) => p.days.includes(i + 1))
                  .map((k) => t(k))
                  .join(", ")}
              </span>
              <button
                onClick={() => removePeriod(p.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors text-sm"
              >
                {t("common_remove")}
              </button>
            </div>
          ))}
        </div>
      )}

      {!showAdd ? (
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          {t("options_addPeriod")}
        </Button>
      ) : (
        <div className="rounded-xl border border-zinc-700 p-4 space-y-4 bg-zinc-800/30">
          <h3 className="font-medium text-sm">{t("options_newPeriod")}</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Input
                className="w-14 text-center"
                value={String(startH)}
                onChange={(e) =>
                  setStartH(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))
                }
              />
              <span className="text-zinc-500">:</span>
              <Input
                className="w-14 text-center"
                value={String(startM).padStart(2, "0")}
                onChange={(e) =>
                  setStartM(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))
                }
              />
            </div>
            <span className="text-zinc-600">{t("options_to")}</span>
            <div className="flex items-center gap-1">
              <Input
                className="w-14 text-center"
                value={String(endH)}
                onChange={(e) => setEndH(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
              />
              <span className="text-zinc-500">:</span>
              <Input
                className="w-14 text-center"
                value={String(endM).padStart(2, "0")}
                onChange={(e) => setEndM(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">{t("options_days")}</p>
            <div className="flex gap-1">
              {DAY_KEYS.map((key, i) => {
                const d = i + 1;
                const active = days.includes(d);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(d)}
                    className={`w-10 h-8 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? "bg-lime-300 text-zinc-900"
                        : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t(key)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              {t("common_cancel")}
            </Button>
            <Button
              size="sm"
              onClick={addPeriod}
              disabled={days.length === 0 || startH * 60 + startM >= endH * 60 + endM}
            >
              {t("common_add")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ PRESETS PANEL ═══

function PresetsPanel({ categories }: { categories: Record<string, CategoryInfo> }) {
  const { t } = useI18n();
  const catKeys = Object.keys(categories);
  const [cat, setCat] = useState(catKeys[0] || "social");
  const [sites, setSites] = useState<string[]>([]);
  const [newSite, setNewSite] = useState("");
  const [goal, setGoal] = useState("");
  const [goalSaved, setGoalSaved] = useState(false);

  useEffect(() => {
    const defaults: Record<string, string[]> = {
      social: ["facebook.com", "twitter.com", "instagram.com", "tiktok.com", "weibo.com"],
      video: ["youtube.com", "bilibili.com", "netflix.com", "douyin.com"],
      game: ["steampowered.com", "epicgames.com", "twitch.tv"],
      news: ["reddit.com", "toutiao.com"],
      adult: ["pornhub.com", "xvideos.com"],
      custom: [],
    };
    setSites(defaults[cat] || []);
    loadGoal(cat);
  }, [cat]);

  async function loadGoal(category: string) {
    try {
      const resp = await chrome.runtime.sendMessage({ type: "getGoal", category });
      setGoal((resp?.goal as string) || t(`goal_${category}`));
    } catch {
      setGoal(t(`goal_${category}`));
    }
  }

  async function saveGoal() {
    try {
      await chrome.runtime.sendMessage({ type: "setGoal", category: cat, goal });
      setGoalSaved(true);
      setTimeout(() => setGoalSaved(false), 2000);
    } catch {
      /* ignore */
    }
  }

  function addSite() {
    if (!newSite.trim() || sites.includes(newSite.trim())) return;
    setSites([...sites, newSite.trim()]);
    setNewSite("");
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">{t("options_presetsTitle")}</h2>
      <p className="text-sm text-zinc-500 mb-6">{t("options_presetsDesc")}</p>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {catKeys.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              cat === c ? "" : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
            }`}
            style={
              cat === c
                ? {
                    backgroundColor: (categories[c] ?? CATEGORY_INFO["custom"])?.themeColor,
                    color: "#18181b",
                  }
                : {}
            }
          >
            {t(`category_${c}`)}
          </button>
        ))}
      </div>

      {/* Goal */}
      <div className="rounded-xl border border-zinc-800 p-4 mb-4">
        <label className="text-sm font-medium text-zinc-300 mb-2 block">{t("options_goal")}</label>
        <div className="flex gap-2">
          <Input
            placeholder={t("options_goalPlaceholder")}
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value);
              setGoalSaved(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && saveGoal()}
            className="flex-1"
          />
          <Button size="sm" onClick={saveGoal}>
            {goalSaved ? "✓" : t("common_save")}
          </Button>
        </div>
        <p className="text-xs text-zinc-600 mt-2">{t("options_goalPlaceholder")}</p>
      </div>

      {/* Sites */}
      <div className="rounded-xl border border-zinc-800 p-4 mb-4">
        <div className="flex gap-2 mb-4">
          <Input
            placeholder={t("options_addSite")}
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSite()}
          />
          <Button size="sm" onClick={addSite} disabled={!newSite.trim()}>
            {t("common_add")}
          </Button>
        </div>

        <div className="space-y-1">
          {sites.length === 0 ? (
            <p className="text-zinc-600 text-sm py-4 text-center">{t("options_noPresets")}</p>
          ) : (
            sites.map((site) => (
              <div
                key={site}
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors"
              >
                <span className="text-sm font-mono text-zinc-300">{site}</span>
                <button
                  className="text-zinc-600 hover:text-red-400 transition-colors text-xs"
                  onClick={() => setSites(sites.filter((s) => s !== site))}
                >
                  {t("common_remove")}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ PASSWORD PANEL ═══

function PasswordPanel({ categories }: { categories: Record<string, CategoryInfo> }) {
  const { t } = useI18n();
  const catKeys = Object.keys(categories);
  const [cat, setCat] = useState(catKeys[0] || "social");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSet() {
    if (password !== confirm) {
      showToast(t("options_passwordMismatch"), "error");
      return;
    }
    if (password.length < 1) {
      showToast(t("options_passwordEmpty"), "error");
      return;
    }
    try {
      await chrome.runtime.sendMessage({
        type: "setPassword",
        category: cat,
        password,
      });
      setSaved(true);
      setPassword("");
      setConfirm("");
      showToast(t("options_passwordSetSuccess", [t(`category_${cat}`)]), "success");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      showToast(t("options_passwordSetFailed"), "error");
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">{t("options_passwordTitle")}</h2>
      <p className="text-sm text-zinc-500 mb-6">{t("options_passwordDesc")}</p>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {catKeys.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCat(c);
              setPassword("");
              setConfirm("");
              setSaved(false);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              cat === c ? "" : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
            }`}
            style={
              cat === c
                ? {
                    backgroundColor: (categories[c] ?? CATEGORY_INFO["custom"])?.themeColor,
                    color: "#18181b",
                  }
                : {}
            }
          >
            {t(`category_${c}`)}
          </button>
        ))}
      </div>

      <div className="max-w-sm space-y-3">
        <Input
          type="password"
          placeholder={t("options_newPassword")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder={t("options_confirmPassword")}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button className="w-full" onClick={handleSet} disabled={!password || !confirm}>
          {saved ? t("options_passwordSaved") : t("options_setPassword", [t(`category_${cat}`)])}
        </Button>
      </div>
    </div>
  );
}

// ═══ EXPORT PANEL ═══

function ExportPanel() {
  const { t } = useI18n();
  const [sel, setSel] = useState<Set<string>>(new Set(["rules"]));
  const [preview, setPreview] = useState("");
  const [importText, setImportText] = useState("");

  const cats = [
    { id: "rules", label: t("options_exportRules") },
    { id: "presets", label: t("options_exportPresets") },
    { id: "schedule", label: t("options_exportSchedule") },
    { id: "auth", label: t("options_exportAuth") },
    { id: "stats", label: t("options_exportStats") },
  ];

  async function handleExport() {
    const json = await chrome.runtime.sendMessage({
      type: "exportData",
      categories: Array.from(sel),
    });
    setPreview(typeof json === "string" ? json : JSON.stringify(json, null, 2));
  }

  function download() {
    const blob = new Blob([preview], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `blocksite-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
  }

  async function handleImport() {
    try {
      const result = await chrome.runtime.sendMessage({
        type: "importData",
        json: importText,
        categories: Array.from(sel),
        mode: "merge",
      });
      if (result?.success) {
        showToast(t("options_importSuccess"), "success");
        setImportText("");
      } else {
        showToast(result?.errors?.join(", ") || t("options_importFailed"), "error");
      }
    } catch {
      showToast(t("options_importFailed"), "error");
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">{t("options_exportTitle")}</h2>

      {/* Export */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-zinc-300 mb-3">{t("options_export")}</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {cats.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/50 text-sm cursor-pointer hover:bg-zinc-800 transition-colors"
            >
              <Checkbox
                checked={sel.has(c.id)}
                onCheckedChange={(checked) => {
                  const n = new Set(sel);
                  checked ? n.add(c.id) : n.delete(c.id);
                  setSel(n);
                }}
              />
              {c.label}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleExport}>
            {t("options_exportGenerate")}
          </Button>
          {preview && (
            <Button size="sm" variant="outline" onClick={download}>
              {t("options_exportDownload")}
            </Button>
          )}
        </div>
        {preview && (
          <pre className="mt-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 overflow-auto max-h-48 font-mono">
            {preview.slice(0, 3000)}
          </pre>
        )}
      </div>

      {/* Import */}
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3">{t("options_import")}</h3>
        <Textarea
          className="w-full h-32 font-mono"
          placeholder={t("options_importPlaceholder")}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <Button size="sm" className="mt-2" onClick={handleImport} disabled={!importText.trim()}>
          {t("options_importButton")}
        </Button>
      </div>
    </div>
  );
}

// ═══ CATEGORIES PANEL ═══

function CategoriesPanel({
  categories,
  categoryOptions,
  onChanged,
}: {
  categories: Record<string, CategoryInfo>;
  categoryOptions: { value: string; label: string }[];
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [color, setColor] = useState("#60A5FA");

  async function handleAdd() {
    if (!name.trim() || !nameEn.trim()) return;
    const key = nameEn.trim().toLowerCase().replace(/\s+/g, "-");
    try {
      await chrome.runtime.sendMessage({
        type: "addCategory",
        info: {
          key,
          label: name.trim(),
          labelEn: nameEn.trim(),
          themeColor: color,
          themeColorLight: color,
        },
      });
      setShowForm(false);
      setName("");
      setNameEn("");
      setColor("#60A5FA");
      onChanged();
      showToast(t("options_categoryAdded"), "success");
    } catch (err) {
      showToast(String(err), "error");
    }
  }

  async function handleEdit() {
    if (!editingKey || !name.trim()) return;
    await chrome.runtime.sendMessage({
      type: "updateCategory",
      key: editingKey,
      info: {
        label: name.trim(),
        labelEn: nameEn.trim(),
        themeColor: color,
        themeColorLight: color,
      },
    });
    setEditingKey(null);
    setName("");
    setNameEn("");
    onChanged();
    showToast(t("options_categoryUpdated"), "success");
  }

  function startEdit(key: string) {
    const info = categories[key] ?? CATEGORY_INFO["custom"];
    setEditingKey(key);
    setName(info?.label ?? key);
    setNameEn(info?.labelEn ?? key);
    setColor(info?.themeColor ?? "#60A5FA");
    setShowForm(true);
  }

  async function handleDelete(key: string) {
    if (!confirm(t("options_deleteCategoryConfirm", [t(`category_${key}`)]))) return;
    try {
      await chrome.runtime.sendMessage({ type: "deleteCategory", key });
      onChanged();
      showToast(t("options_categoryDeleted"), "info");
    } catch (err) {
      showToast(String(err), "error");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("options_categoriesTitle")}</h2>
          <p className="text-sm text-zinc-500 mt-1">{t("options_categoriesDesc")}</p>
        </div>
        <Button
          onClick={() => {
            setEditingKey(null);
            setName("");
            setNameEn("");
            setColor("#60A5FA");
            setShowForm(true);
          }}
        >
          {t("options_addCategory")}
        </Button>
      </div>

      <div className="space-y-2">
        {categoryOptions.map(({ value: key, label }) => {
          const info = categories[key] ?? CATEGORY_INFO["custom"];
          const isBuiltIn = info?.isBuiltIn ?? false;
          return (
            <div
              key={key}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30"
            >
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: info?.themeColor ?? "#818CF8" }}
              />
              <span className="flex-1 text-sm">{label}</span>
              <span className="text-xs text-zinc-500 hidden sm:inline">{info?.labelEn ?? key}</span>
              {isBuiltIn && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">
                  {t("options_builtIn")}
                </span>
              )}
              <button
                onClick={() => startEdit(key)}
                className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                {t("common_edit")}
              </button>
              {!isBuiltIn && (
                <button
                  onClick={() => handleDelete(key)}
                  className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                >
                  {t("common_delete")}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingKey !== null ? t("options_editCategory") : t("options_addCategoryTitle")}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">{t("options_categoryName")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("category_social")}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">
              {t("options_categoryNameEn")}
            </label>
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder={t("category_social")}
              disabled={editingKey !== null}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">{t("options_categoryColor")}</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-xs text-zinc-500 font-mono">{color}</span>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1">
              {t("common_cancel")}
            </Button>
            <Button
              className="flex-1"
              onClick={editingKey !== null ? handleEdit : handleAdd}
              disabled={!name.trim() || !nameEn.trim()}
            >
              {editingKey !== null ? t("common_save") : t("common_add")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══ SETTINGS PANEL ═══

function SettingsPanel() {
  const { t, locale, setLocale } = useI18n();
  const [autoRecover, setAutoRecover] = useState(30);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "getConfig" }).then((resp) => {
      const config = resp?.config as Record<string, unknown> | undefined;
      if (config) {
        setAutoRecover((config["autoRecoverMinutes"] as number) ?? 30);
        setEnabled((config["enabled"] as boolean) ?? true);
      }
    });
  }, []);

  async function handleAutoRecoverChange(val: number) {
    setAutoRecover(val);
    await chrome.runtime.sendMessage({ type: "setAutoRecover", minutes: val });
  }

  async function handleToggle() {
    const newVal = !enabled;
    setEnabled(newVal);
    await chrome.runtime.sendMessage({ type: "toggleEnabled", enabled: newVal });
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">{t("options_settingsTitle")}</h2>

      <div className="space-y-6">
        <div className="rounded-xl border border-zinc-800 p-4">
          <h3 className="text-sm font-medium mb-3">{t("options_language")}</h3>
          <Select
            options={[
              { value: "auto", label: t("options_languageAuto") },
              { value: "en", label: t("settings_langEn") },
              { value: "zh_CN", label: t("settings_langZhCN") },
            ]}
            value={locale}
            onChange={async (e) => {
              await setLocale(e.target.value as "auto" | "en" | "zh_CN");
            }}
          />
        </div>

        <div className="rounded-xl border border-zinc-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">{t("options_globalBlocking")}</h3>
              <p className="text-xs text-zinc-500 mt-1">{t("options_globalBlockingDesc")}</p>
            </div>
            <Toggle checked={enabled} onCheckedChange={handleToggle} />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 p-4">
          <h3 className="text-sm font-medium mb-1">{t("options_autoRecover")}</h3>
          <p className="text-xs text-zinc-500 mb-3">{t("options_autoRecoverDesc")}</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className="w-20 text-center"
              value={String(autoRecover)}
              onChange={(e) => {
                const v = parseInt(e.target.value) || 0;
                handleAutoRecoverChange(Math.max(0, Math.min(480, v)));
              }}
              min={0}
              max={480}
            />
            <span className="text-sm text-zinc-400">{t("options_autoRecoverUnit")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ AI PANEL ═══

function AIPanel() {
  const { t } = useI18n();
  const [provider, setProvider] = useState<AIProvider>("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [savedKeys, setSavedKeys] = useState<
    { provider: string; key: string; baseUrl?: string; model?: string }[]
  >([]);
  const [features, setFeatures] = useState({
    categorize: true,
    quotes: true,
    nlRules: true,
    insights: true,
  });
  const [loaded, setLoaded] = useState(false);
  const [logs, setLogs] = useState<
    {
      id: string;
      timestamp: number;
      provider: string;
      feature: string;
      input: string;
      output: string;
      success: boolean;
    }[]
  >([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const keys = (await chrome.runtime.sendMessage({
        type: "ai:getApiKeys",
      })) as { provider: string; key: string; baseUrl?: string; model?: string }[];
      setSavedKeys(keys ?? []);
    } catch {
      /* ignore */
    }
    try {
      const savedFeatures = (await chrome.runtime.sendMessage({
        type: "ai:getFeatureConfig",
      })) as Record<string, boolean>;
      if (savedFeatures && typeof savedFeatures === "object") {
        setFeatures((prev) => ({ ...prev, ...savedFeatures }));
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }

  const selectedProvider = PROVIDER_INFO_LIST.find((p) => p.key === provider);
  const hasSavedKey = savedKeys.some((k) => k.provider === provider);
  const providerModel = model || selectedProvider?.defaultModel || "";

  async function handleTest() {
    setTestStatus("loading");
    setTestError("");
    try {
      await chrome.runtime.sendMessage({
        type: "ai:testConnection",
        provider,
        model: providerModel,
      });
      setTestStatus("success");
      setTimeout(() => setTestStatus("idle"), 3000);
    } catch (err) {
      setTestStatus("error");
      setTestError(err instanceof Error ? err.message : t("options_aiConnectionFailed"));
      setTimeout(() => setTestStatus("idle"), 5000);
    }
  }

  async function handleSaveKey() {
    if (!apiKey.trim()) return;
    try {
      await chrome.runtime.sendMessage({
        type: "ai:setApiKey",
        record: {
          provider,
          key: apiKey.trim(),
          baseUrl: selectedProvider?.requiresBaseUrl ? baseUrl.trim() || undefined : undefined,
          model: providerModel || undefined,
        },
      });
      // Also save as default provider/model
      await chrome.runtime.sendMessage({
        type: "ai:setFeatureConfig",
        features: { provider, model: providerModel || selectedProvider?.defaultModel || "" },
      });
      setApiKey("");
      setBaseUrl("");
      showToast(t("options_aiKeySaved"), "success");
      await loadConfig();
    } catch {
      showToast(t("options_aiKeySaveFailed"), "error");
    }
  }

  async function handleRemoveKey(p: string) {
    try {
      await chrome.runtime.sendMessage({ type: "ai:removeApiKey", provider: p });
      showToast(t("options_aiKeyRemoved"), "info");
      await loadConfig();
    } catch {
      showToast(t("options_aiKeyRemoveFailed"), "error");
    }
  }

  async function loadLogs() {
    try {
      const result = (await chrome.runtime.sendMessage({
        type: "ai:getCallLogs",
      })) as {
        id: string;
        timestamp: number;
        provider: string;
        feature: string;
        input: string;
        output: string;
        success: boolean;
      }[];
      setLogs(result ?? []);
    } catch {
      /* ignore */
    }
  }

  async function clearLogs() {
    try {
      await chrome.runtime.sendMessage({ type: "ai:clearCallLogs" });
      setLogs([]);
    } catch {
      /* ignore */
    }
  }

  async function handleFeatureToggle(key: string, value: boolean) {
    const updated = { ...features, [key]: value };
    setFeatures(updated);
    try {
      await chrome.runtime.sendMessage({
        type: "ai:setFeatureConfig",
        features: updated,
      });
    } catch {
      /* ignore persistence errors */
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center gap-3 py-8">
        <div className="w-5 h-5 border-2 border-lime-300 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-500">{t("options_aiLoadingSettings")}</span>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">{t("options_aiTitle")}</h2>
      <p className="text-sm text-zinc-500 mb-6">{t("options_aiDesc")}</p>

      {/* Section A: API Key Management */}
      <section className="mb-8">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">
          {t("options_aiApiKeyManagement")}
        </h3>

        <div className="rounded-xl border border-zinc-800 p-4 space-y-4 mb-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">{t("options_aiProvider")}</label>
            <Select
              options={PROVIDER_INFO_LIST.map((p) => ({
                value: p.key,
                label: p.name,
              }))}
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as AIProvider);
                setTestStatus("idle");
                setTestError("");
              }}
            />
            {selectedProvider && (
              <p className="text-xs text-zinc-600 mt-1">{selectedProvider.description}</p>
            )}
          </div>

          <div>
            <label className="text-sm text-zinc-400 mb-1 block">{t("options_aiApiKey")}</label>
            <Input
              type="password"
              placeholder={
                hasSavedKey ? t("options_aiApiKeyReplace") : t("options_aiApiKeyPlaceholder")
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {selectedProvider?.requiresBaseUrl && (
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">{t("options_aiBaseUrl")}</label>
              <Input
                placeholder="http://localhost:11434"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="text-sm text-zinc-400 mb-1 block">{t("options_aiModel")}</label>
            <Select
              options={(selectedProvider?.models ?? []).map((m) => ({
                value: m,
                label: m,
              }))}
              value={providerModel}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testStatus === "loading"}
            >
              {testStatus === "loading"
                ? t("options_aiTesting")
                : testStatus === "success"
                  ? t("options_aiConnected")
                  : testStatus === "error"
                    ? t("options_aiFailed")
                    : t("options_aiTestConnection")}
            </Button>
            <Button size="sm" onClick={handleSaveKey} disabled={!apiKey.trim()}>
              {t("options_aiSaveKey")}
            </Button>
            {hasSavedKey && (
              <Button variant="destructive" size="sm" onClick={() => handleRemoveKey(provider)}>
                {t("options_aiRemoveKey")}
              </Button>
            )}
          </div>

          {testStatus === "success" && (
            <p className="text-sm text-lime-300">{t("options_aiConnectionSuccess")}</p>
          )}
          {testStatus === "error" && (
            <p className="text-sm text-red-400">{testError || t("options_aiConnectionFailed")}</p>
          )}
        </div>

        {/* Saved keys list */}
        {savedKeys.length > 0 && (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <div className="px-4 py-2.5 bg-zinc-800/30 text-sm text-zinc-500 border-b border-zinc-800">
              {t("options_aiConfiguredProviders")}
            </div>
            {savedKeys.map((k) => (
              <div
                key={k.provider}
                className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50 last:border-0"
              >
                <div>
                  <span className="text-sm text-zinc-300">
                    {PROVIDER_INFO_LIST.find((p) => p.key === k.provider)?.name ?? k.provider}
                  </span>
                  {k.model && <span className="text-xs text-zinc-500 ml-2">{k.model}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600 font-mono">{k.key}</span>
                  <button
                    onClick={() => handleRemoveKey(k.provider)}
                    className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    {t("options_aiRemove")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section B: Feature Toggles */}
      <section>
        <h3 className="text-sm font-medium text-zinc-300 mb-4">{t("options_aiFeatures")}</h3>
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <FeatureToggleRow
            label={t("options_aiFeatureCategorize")}
            description={t("options_aiFeatureCategorizeDesc")}
            checked={features.categorize}
            onChange={(v) => handleFeatureToggle("categorize", v)}
          />
          <FeatureToggleRow
            label={t("options_aiFeatureQuotes")}
            description={t("options_aiFeatureQuotesDesc")}
            checked={features.quotes}
            onChange={(v) => handleFeatureToggle("quotes", v)}
          />
          <FeatureToggleRow
            label={t("options_aiFeatureNlRules")}
            description={t("options_aiFeatureNlRulesDesc")}
            checked={features.nlRules}
            onChange={(v) => handleFeatureToggle("nlRules", v)}
          />
          <FeatureToggleRow
            label={t("options_aiFeatureInsights")}
            description={t("options_aiFeatureInsightsDesc")}
            checked={features.insights}
            onChange={(v) => handleFeatureToggle("insights", v)}
          />
        </div>
      </section>

      {/* Section C: Call History */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-300">Call History</h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowLogs(!showLogs);
                if (!showLogs) loadLogs();
              }}
            >
              {showLogs ? "Hide" : "Show"}
            </Button>
            {logs.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearLogs}>
                Clear
              </Button>
            )}
          </div>
        </div>
        {showLogs && (
          <div className="rounded-xl border border-zinc-800 overflow-hidden max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-zinc-600">
                No AI calls yet. Calls will appear here after using AI features.
              </div>
            ) : (
              logs.slice(0, 50).map((log) => (
                <div
                  key={log.id}
                  className="px-3 py-2 border-b border-zinc-800/50 last:border-0 text-xs"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-zinc-500 tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${log.success ? "bg-lime-300" : "bg-red-400"}`}
                    />
                    <span className="text-zinc-400 font-medium">
                      {FEATURE_LABELS[log.feature] ?? log.feature}
                    </span>
                    <span className="text-zinc-600">via {log.provider}</span>
                  </div>
                  <div className="text-zinc-600 truncate">
                    {log.success ? log.output.slice(0, 80) : log.output}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function FeatureToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 last:border-0">
      <div>
        <p className="text-sm text-zinc-300">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
