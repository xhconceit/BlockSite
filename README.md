# BlockSite

[English](#english) | 中文

浏览器网站拦截插件 — 帮助你保持专注。<br>
_A browser extension that blocks distracting websites to help you stay focused._

## 功能 · Features

- **5 种拦截模式 / Blocking modes**：域名 (domain)、路径 (path)、关键词 (keyword)、正则 (regex)、通配符 (wildcard)
- **6 个分类 / Categories**：社交、视频、游戏、新闻、成人、自定义 — 各有预设网站和励志语录
- **临时解锁 / Temporary unlock**：密码保护、可配时长、每日次数限制、到期续期
- **定时拦截 / Schedule**：多时段、番茄钟、特殊日期排除
- **统计仪表盘 / Dashboard**：按分类/时段/规则的趋势对比图表
- **暗色优先 UI / Dark-first UI**：分类主题色，shadcn/ui 组件
- **中英双语 / i18n**：Chrome i18n 支持 en / zh_CN

## 开发 · Development

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发模式 (Chrome) / dev mode
pnpm build            # 构建 / build → .output/chrome-mv3/
pnpm typecheck        # 类型检查 / type check
pnpm test             # 跑全部测试 / run all tests
pnpm vitest run packages/storage/__tests__/stores.test.ts  # 单个测试 / single test
pnpm format && pnpm lint  # 格式化 + Lint
```

## 加载 · Load Extension

1. `pnpm build`
2. Chrome → `chrome://extensions/` → 开启「开发者模式」/ Enable "Developer mode"
3. 「加载已解压的扩展程序」→ 选择 `.output/chrome-mv3/` / "Load unpacked" → select `.output/chrome-mv3/`

## 技术栈 · Tech Stack

| 层                | 技术                                                |
| ----------------- | --------------------------------------------------- |
| 框架 / Framework  | WXT + React 19                                      |
| 语言 / Language   | TypeScript (strictest)                              |
| 样式 / Styling    | Tailwind CSS 4 + shadcn/ui                          |
| 存储 / Storage    | IndexedDB (Dexie.js), chrome.storage.local fallback |
| 拦截 / Blocking   | declarativeNetRequest API                           |
| 测试 / Testing    | Vitest + fake-indexeddb                             |
| 工具 / Tooling    | oxfmt + oxlint + simple-git-hooks                   |
| 包管理 / Monorepo | pnpm workspace                                      |

## 架构 · Architecture

```
packages/          # 10 个解耦包 / 10 decoupled packages
├── core/           # 共享类型和常量（零依赖） / types & constants
├── storage/        # IndexedDB 唯一入口 / sole DB access point
├── event-bus/      # 类型化消息总线 / typed message bus
├── rules/          # 规则 CRUD + DNR 转换 / rule logic & DNR conversion
├── schedule/       # 多时段/番茄钟/日期排除 / scheduling
├── auth/           # SHA-256 密码哈希 / password hashing
├── unlock/         # 临时解锁逻辑 / temp unlock
├── stats/          # 统计记录 + 汇总 / stats recording & aggregation
├── presets/        # 分类预设网站和语录 / presets & quotes
└── import-export/  # 选择性 JSON 导入导出 / selective import/export

entrypoints/
├── background.ts    # Service Worker — 编排核心 / orchestration
├── popup/           # 360×500 弹窗
├── options/         # 设置页（响应式） / settings page
├── blocked/         # 拦截展示页（分类主题） / blocked page
└── dashboard/       # 统计仪表盘

components/ui/       # UI 组件（Button, Input, Select, Modal, Toggle…）
hooks/              # React hooks（useI18n）
_locales/           # Chrome i18n 语言文件 / locale files
```

### 包依赖 · Dependencies

```
storage → core
event-bus → core
rules → core, storage, event-bus
schedule → core, storage, event-bus
auth → core, storage
unlock → core, storage, auth, event-bus
stats → core, storage
presets → core, storage
import-export → core, storage, rules, schedule, presets
```

`@blocksite/storage` 是唯一直接访问 IndexedDB 的包。所有数据读写通过它。<br>
_`@blocksite/storage` is the only package that directly accesses IndexedDB._

### 事件总线 · Event Bus

同上下文用类型化 `EventEmitter`，跨上下文（popup ↔ background）封装 `chrome.runtime.sendMessage`。事件类型在 `@blocksite/core` 的 `EventMap` 中统一定义。<br>
_Same-context uses typed `EventEmitter`; cross-context wraps `chrome.runtime.sendMessage`. All event types defined in `@blocksite/core` `EventMap`._

### TypeScript 严格模式 · Strict Config

`tsconfig.base.json` 存放公共编译选项，`tsconfig.strict.json` 继承 base 并打开所有 strict 标志。oxlint 全部类别 error 级别。<br>
_`tsconfig.strict.json` extends `tsconfig.base.json` with all strict flags enabled. oxlint all categories at error level._

---

<a id="english"></a>

## English

BlockSite is a Chrome MV3 extension that blocks distracting websites. It uses `declarativeNetRequest` for zero-overhead blocking at the browser level.

**Key design decisions:**

- 10 decoupled packages in a pnpm workspace, each independently testable
- IndexedDB via Dexie.js with transparent `chrome.storage.local` fallback
- Domain rules auto-strip `http://`, `https://`, `www.` — blocks both schemes
- `webNavigation` listeners catch redirect chains to blocked domains
- Incremental default rules seeding (14 sites across 6 categories)
- Category-themed blocked pages with localized motivational quotes
