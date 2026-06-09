# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # WXT dev mode (opens Chrome)
pnpm build            # production build → .output/chrome-mv3/
pnpm typecheck        # tsc --noEmit on entire project
pnpm test             # vitest run (47 tests, 4 files)
pnpm vitest run packages/storage/__tests__/stores.test.ts  # single file
pnpm lint             # oxlint
pnpm format           # oxfmt (auto-fix), pnpm format:check (verify only)
```

Pre-commit hook enforces: format check → lint → full test suite.

## Architecture

This is a **pnpm workspace monorepo** for a Chrome MV3 extension built with WXT + React 19 + TypeScript + Tailwind CSS 4.

### Package layers (dependency order)

```
core (types/constants, zero deps)
  ├── storage (ONLY IndexedDB access point; Dexie.js + chrome.storage.local fallback)
  ├── event-bus (typed emitter for same-context, chrome.runtime wrapper for cross-context)
  ├── auth (SHA-256 hashing, timing-safe comparison)
  ├── presets (category preset sites & quotes)
  └── stats (block event recording, aggregations, trends)

rules → core, storage, event-bus
schedule → core, storage, event-bus
unlock → core, storage, auth, event-bus
import-export → core, storage, rules, schedule, presets
```

**Key rule**: `@blocksite/storage` is the ONLY package that touches IndexedDB. All other packages go through its API. When IndexedDB is unavailable, it falls back to `chrome.storage.local` transparently.

### Entrypoints (WXT)

- `background.ts` — Service worker. Calls `ensureInitialized()` before processing any message. Seeds default rules if DB is empty. Manages DNR sync, schedule alarms, unlock timers, and stats recording.
- `popup/` — 360×500 fixed. Quick-add current site, toggle global block, stats overview.
- `options/` — Full-page. 5 tabs: Rules (CRUD + batch + drag + edit), Schedule, Presets, Passwords, Import/Export.
- `blocked/` — Category-themed blocked page. Shows quote/custom message, password-gated unlock, countdown, extension prompt.
- `dashboard/` — Stats charts (category bars, hourly heatmap, rule ranking, trend).

### DNR rules

Blocking rules are converted to `chrome.declarativeNetRequest` rules. Domain rules strip `http://`, `https://`, `www.` prefixes automatically — they block both HTTP and HTTPS unless the user explicitly writes a scheme. `requestDomains` handles direct navigation; `webNavigation` listener catches redirect chains.

### Storage schema (IndexedDB object stores)

| Store       | Key               | Content                                  |
| ----------- | ----------------- | ---------------------------------------- |
| rules       | id (string)       | BlockedItem objects                      |
| presets     | category (string) | { sites: string[], quotes: QuoteItem[] } |
| schedule    | id (string)       | ScheduleConfig                           |
| auth        | category (string) | { hash: string }                         |
| unlockState | category (string) | UnlockState                              |
| stats       | id (string)       | BlockStatsRecord                         |
| dailyStats  | date (string)     | DailyStats                               |
| settings    | key (string)      | { value: unknown }                       |

### i18n

Chrome WebExtension i18n via `_locales/<lang>/messages.json`. Keys use underscore separators (dots are illegal). `useI18n()` hook wraps `chrome.i18n.getMessage()`. Daily quotes are localized per category per language.

### TypeScript config

`tsconfig.base.json` → shared (target, module, jsx, paths)
`tsconfig.strict.json` → extends base, enables ALL strict flags
Every package `tsconfig.json` → extends `../../tsconfig.strict.json`
**No project references** — typecheck uses `tsc --noEmit` with paths aliases.

### oxlint

All categories at `error` level: correctness, suspicious, pedantic, style, nursery, perf, restriction.

## Gotchas

### WXT quirks

- **CSS must be imported in main.tsx**: `import './style.css'` in each entrypoint's `main.tsx`. WXT won't link CSS from HTML alone.
- **`_locales/` requires a build hook**: WXT doesn't auto-copy `_locales/` to output. The `build:done` hook in `wxt.config.ts` does `cpSync`.
- **`options.openInTab`**: Must be set via WXT's `options: { openInTab: true }` config, NOT in `manifest.options_ui`. The manifest value gets overridden during build.
- **`defineBackground`**: Auto-imported by WXT at build time. TypeScript needs a `globals.d.ts` declaration.

### Strict TypeScript patterns

- **`exactOptionalPropertyTypes`**: `{ error?: string }` means `error` can be absent OR a string, NOT `string | undefined`. Assigning `string | undefined` to it is an error. Use `?? 'fallback'` to coerce.
- **`noPropertyAccessFromIndexSignature`**: `Record<string, unknown>` must use bracket notation: `data['key']`, not `data.key`.
- **`noUnusedParameters`**: Prefix unused params with `_` (e.g., `_sender`).

### Background service worker

- **Initialization lock**: `ensureInitialized()` caches the init promise. All message handlers and event listeners MUST `await ensureInitialized()` before accessing storage. The SW can be terminated and restarted at any time in MV3.
- First call to `initialize()` calls `seedDefaultRules()` which is idempotent — only adds default sites that don't already exist.
- `DNR_RULE_ID_BASE = 1000` — all dynamic rule IDs start here to avoid collisions.

### Storage fallback

When IndexedDB fails, `initStorage()` sets `fallbackMode = true`. All store methods check `if (fallbackMode)` and use `chrome.storage.local` as a single JSON blob under the key `blocksite_config`. This happens transparently — callers don't need to handle it.

### Build output

- Extension loads from `.output/chrome-mv3/`
- CSS: `<name>-<hash>.css` in `assets/`
- JS chunks: `<name>-<hash>.js` in `chunks/`
- The `build:done` hook patches `options_ui.open_in_tab = true` and copies `_locales/`
