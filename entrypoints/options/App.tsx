import { useState, useEffect } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Toggle } from "../../components/ui/Toggle";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ToastContainer, showToast } from "../../components/ui/Toast";
import { useI18n } from "../../hooks/useI18n";
import { CATEGORY_INFO, BLOCK_TYPE_LABELS } from "../../packages/core/src";
import type { BlockedItem, BlockType, SchedulePeriod, CategoryInfo } from "../../packages/core/src";

const TAB_KEYS = [
  "rules",
  "schedule",
  "presets",
  "password",
  "categories",
  "export",
  "settings",
] as const;

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

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: "getConfig" });
      setRules((resp?.rules as BlockedItem[]) || []);
    } catch {
      /* ignore */
    }
    setLoaded(true);
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
          <input
            type="checkbox"
            checked={allSel}
            onChange={() => setSelected(allSel ? new Set() : new Set(filtered.map((r) => r.id)))}
            className="rounded"
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
              <input
                type="checkbox"
                checked={selected.has(rule.id)}
                onChange={() => {
                  const next = new Set(selected);
                  next.has(rule.id) ? next.delete(rule.id) : next.add(rule.id);
                  setSelected(next);
                }}
                className="rounded"
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
  }, [cat]);

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
              <input
                type="checkbox"
                checked={sel.has(c.id)}
                onChange={() => {
                  const n = new Set(sel);
                  n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                  setSel(n);
                }}
                className="rounded"
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
        <textarea
          className="w-full h-32 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-300 resize-none"
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
