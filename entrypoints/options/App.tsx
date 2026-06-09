import { useState, useEffect } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Toggle } from "../../components/ui/Toggle";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ToastContainer, showToast } from "../../components/ui/Toast";
import { CATEGORIES, CATEGORY_INFO, BLOCK_TYPE_LABELS } from "../../packages/core/src";
import type { BlockedItem, Category, BlockType, SchedulePeriod } from "../../packages/core/src";

const TABS = [
  { id: "rules", label: "Rules", icon: "#" },
  { id: "schedule", label: "Schedule", icon: "⏰" },
  { id: "presets", label: "Presets", icon: "📋" },
  { id: "password", label: "Passwords", icon: "🔒" },
  { id: "export", label: "Import/Export", icon: "📦" },
];

export default function App() {
  const [tab, setTab] = useState("rules");

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-lg font-bold">BlockSite</h1>
          <p className="text-xs text-zinc-500">Settings</p>
        </div>
        <nav className="flex-1 p-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                tab === t.id
                  ? "bg-zinc-800 text-zinc-100 font-medium"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
              }`}
            >
              {t.label}
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
          {tab === "rules" && <RulesPanel />}
          {tab === "schedule" && <SchedulePanel />}
          {tab === "presets" && <PresetsPanel />}
          {tab === "password" && <PasswordPanel />}
          {tab === "export" && <ExportPanel />}
        </div>
      </main>

      <ToastContainer />
    </div>
  );
}

// ═══ RULES PANEL ═══

function RulesPanel() {
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
  const [addCat, setAddCat] = useState<Category>("custom");
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
      showToast("Rule updated", "success");
    } else {
      const rule: BlockedItem = {
        id: crypto.randomUUID(),
        type: addType,
        value: addValue.trim(),
        enabled: true,
        category: addCat,
        customMessage: addMsg.trim(),
        order: rules.length,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveRules([...rules, rule]);
      showToast("Rule added", "success");
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
    showToast(`Deleted ${selected.size} rules`, "info");
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
        <span className="text-zinc-500">Loading rules...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Blocking Rules</h2>
          <p className="text-sm text-zinc-500 mt-1">
            {rules.length} rules · {rules.filter((r) => r.enabled).length} active
          </p>
        </div>
        <Button onClick={startAdd}>+ Add Rule</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          options={[
            { value: "all", label: "All types" },
            ...Object.entries(BLOCK_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })),
          ]}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-32"
        />
        <Select
          options={[
            { value: "all", label: "All categories" },
            ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_INFO[c].label })),
          ]}
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="w-36"
        />
      </div>

      {/* Batch bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <span className="text-sm text-zinc-400">{selected.size} selected</span>
          <Button variant="ghost" size="sm" onClick={() => {}}>
            Enable
          </Button>
          <Button variant="ghost" size="sm" onClick={() => {}}>
            Disable
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteSelected}>
            Delete
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
          Select all
        </label>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 mb-2">
              {rules.length === 0 ? "No rules yet" : "No matching rules"}
            </p>
            {rules.length === 0 && (
              <Button variant="ghost" size="sm" onClick={startAdd}>
                Add your first rule
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
              <Badge color={CATEGORY_INFO[rule.category].themeColor}>
                {CATEGORY_INFO[rule.category].label}
              </Badge>
              <span className="text-[11px] text-zinc-600 w-14">{BLOCK_TYPE_LABELS[rule.type]}</span>
              <button
                onClick={() => startEdit(rule)}
                className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors px-1"
              >
                Edit
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
        title={editingId !== null ? "Edit Rule" : "Add Rule"}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Match type</label>
            <Select
              options={Object.entries(BLOCK_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              value={addType}
              onChange={(e) => setAddType(e.target.value as BlockType)}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Value</label>
            <Input
              placeholder={
                addType === "domain"
                  ? "e.g. facebook.com"
                  : addType === "keyword"
                    ? "e.g. game"
                    : addType === "wildcard"
                      ? "e.g. *.example.com"
                      : "e.g. .*.torrent.*"
              }
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Category</label>
            <Select
              options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_INFO[c].label }))}
              value={addCat}
              onChange={(e) => setAddCat(e.target.value as Category)}
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 mb-1 block">Custom message (optional)</label>
            <Input
              placeholder="Show this instead of a quote on the blocked page"
              value={addMsg}
              onChange={(e) => setAddMsg(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowForm(false)} className="flex-1">
              Cancel
            </Button>
            <Button className="flex-1" onClick={saveRule} disabled={!addValue.trim()}>
              {editingId !== null ? "Save" : "Add Rule"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══ SCHEDULE PANEL ═══

function SchedulePanel() {
  const [enabled, setEnabled] = useState(false);
  const [periods, setPeriods] = useState<SchedulePeriod[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false); // schedule panel
  const [startH, setStartH] = useState(9);
  const [startM, setStartM] = useState(0);
  const [endH, setEndH] = useState(17);
  const [endM, setEndM] = useState(0);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);

  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
    showToast("Period added", "success");
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
        <span className="text-zinc-500">Loading schedule...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Schedule</h2>
          <p className="text-sm text-zinc-500 mt-1">Only block during specific times</p>
        </div>
        <Toggle
          checked={enabled}
          onCheckedChange={(v) => save(periods, v)}
          label="Enable schedule"
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
                {DAYS.filter((_, i) => p.days.includes(i + 1)).join(", ")}
              </span>
              <button
                onClick={() => removePeriod(p.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {!showAdd ? (
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          + Add time period
        </Button>
      ) : (
        <div className="rounded-xl border border-zinc-700 p-4 space-y-4 bg-zinc-800/30">
          <h3 className="font-medium text-sm">New Time Period</h3>
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
            <span className="text-zinc-600">to</span>
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
            <p className="text-xs text-zinc-500 mb-2">Days</p>
            <div className="flex gap-1">
              {DAYS.map((label, i) => {
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
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={addPeriod}
              disabled={days.length === 0 || startH * 60 + startM >= endH * 60 + endM}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ PRESETS PANEL ═══

function PresetsPanel() {
  const [cat, setCat] = useState<Category>("social");
  const [sites, setSites] = useState<string[]>([]);
  const [newSite, setNewSite] = useState("");

  useEffect(() => {
    const defaults: Record<Category, string[]> = {
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
      <h2 className="text-xl font-semibold mb-2">Category Presets</h2>
      <p className="text-sm text-zinc-500 mb-6">Predefined sites you can block with one click</p>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              cat === c ? "" : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
            }`}
            style={
              cat === c ? { backgroundColor: CATEGORY_INFO[c].themeColor, color: "#18181b" } : {}
            }
          >
            {CATEGORY_INFO[c].label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 p-4 mb-4">
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Add site..."
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSite()}
          />
          <Button size="sm" onClick={addSite} disabled={!newSite.trim()}>
            Add
          </Button>
        </div>

        <div className="space-y-1">
          {sites.length === 0 ? (
            <p className="text-zinc-600 text-sm py-4 text-center">No presets for this category</p>
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
                  Remove
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

function PasswordPanel() {
  const [cat, setCat] = useState<Category>("social");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saved, setSaved] = useState(false);

  async function handleSet() {
    if (password !== confirm) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (password.length < 1) {
      showToast("Password cannot be empty", "error");
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
      showToast(`Password set for ${CATEGORY_INFO[cat].label}`, "success");
      setTimeout(() => setSaved(false), 2000);
    } catch {
      showToast("Failed to set password", "error");
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Password Protection</h2>
      <p className="text-sm text-zinc-500 mb-6">Set per-category unlock passwords</p>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {CATEGORIES.map((c) => (
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
              cat === c ? { backgroundColor: CATEGORY_INFO[c].themeColor, color: "#18181b" } : {}
            }
          >
            {CATEGORY_INFO[c].label}
          </button>
        ))}
      </div>

      <div className="max-w-sm space-y-3">
        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button className="w-full" onClick={handleSet} disabled={!password || !confirm}>
          {saved ? "Saved!" : `Set Password for ${CATEGORY_INFO[cat].label}`}
        </Button>
      </div>
    </div>
  );
}

// ═══ EXPORT PANEL ═══

function ExportPanel() {
  const [sel, setSel] = useState<Set<string>>(new Set(["rules"]));
  const [preview, setPreview] = useState("");
  const [importText, setImportText] = useState("");

  const cats = [
    { id: "rules", label: "Rules" },
    { id: "presets", label: "Presets" },
    { id: "schedule", label: "Schedule" },
    { id: "auth", label: "Passwords" },
    { id: "stats", label: "Statistics" },
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
        showToast("Import successful", "success");
        setImportText("");
      } else {
        showToast(result?.errors?.join(", ") || "Import failed", "error");
      }
    } catch {
      showToast("Import failed", "error");
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6">Import / Export</h2>

      {/* Export */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Export</h3>
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
            Generate
          </Button>
          {preview && (
            <Button size="sm" variant="outline" onClick={download}>
              Download
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
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Import</h3>
        <textarea
          className="w-full h-32 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-lime-300 resize-none"
          placeholder="Paste JSON..."
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <Button size="sm" className="mt-2" onClick={handleImport} disabled={!importText.trim()}>
          Import
        </Button>
      </div>
    </div>
  );
}
