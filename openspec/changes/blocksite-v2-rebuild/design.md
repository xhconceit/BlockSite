## 背景

BlockSite 是一款拦截分心网站的浏览器扩展。v1 使用单体 `chrome.storage.local`，UI 和业务逻辑紧耦合。v2 重建目标：解耦的包架构、IndexedDB 存储、暗色优先设计、完整测试覆盖。

**约束条件：**

- 必须使用 `declarativeNetRequest` API 做拦截（浏览器层面，零运行时开销）
- 必须离线工作（全部本地数据）
- 必须支持 Chrome/Edge (MV3)、Firefox (MV2)、Safari
- Popup 尺寸固定 360×500（Chromium 规范）

## 目标 / 非目标

**目标：**

- 业务逻辑解耦为可独立测试的包
- 通过集中式 storage 包统一管理所有数据访问，底层用 IndexedDB
- 暗色优先设计，丰富动效，分类主题化
- 通过事件总线实现类型化、解耦的跨上下文通信
- 所有包的公开方法 100% 单元测试覆盖
- CI 管线：格式检查 → lint → 测试 → 构建

**非目标：**

- 云端同步或任何网络功能
- 多用户支持
- v1 存储格式迁移
- 移动端浏览器支持（扩展不跑在移动端）
- v2 国际化（后续迭代）

## 决策

### 1. Monorepo 结构：pnpm workspace

每个领域关注点作为 `packages/` 下的独立包，有自己的 `package.json`、`tsconfig.json` 和测试套件。WXT 扩展入口在根级别，通过 workspace 引用依赖包。

**替代方案：**

- 单包 + 文件夹模块 → 拒绝：没有真正的解耦，难以强制边界
- WXT 模块 → 拒绝：包与 WXT 生命周期耦合，难以独立测试

```
blocksite/
├── packages/
│   ├── core/              # 共享类型、常量、工具（零依赖）
│   ├── storage/           # IndexedDB 访问层（依赖：core）
│   ├── event-bus/         # 类型化消息总线（依赖：core）
│   ├── rules/             # 规则 CRUD + DNR 转换（依赖：core, storage, event-bus）
│   ├── schedule/          # 调度逻辑（依赖：core, storage, event-bus）
│   ├── auth/              # 密码哈希 + 校验（依赖：core, storage）
│   ├── unlock/            # 临时解锁逻辑（依赖：core, storage, auth, event-bus）
│   ├── stats/             # 统计记录 + 查询（依赖：core, storage）
│   ├── presets/           # 分类预设管理（依赖：core, storage）
│   └── import-export/     # JSON 导出入（依赖：core, storage, rules, schedule, presets）
├── entrypoints/           # WXT 入口（popup, options, blocked, dashboard, background）
├── wxt.config.ts
├── pnpm-workspace.yaml
└── package.json
```

### 2. 存储：IndexedDB 通过集中式包

`@blocksite/storage` 是**唯一**访问 IndexedDB 的包。所有其他包通过其公开 API 读写数据。这确保了一致的 schema、事务处理和升级路径。

**Schema — Object Stores：**
| Store | Key | 说明 |
|-------|-----|------|
| `rules` | `id`（字符串） | 拦截规则 |
| `presets` | `category`（字符串） | 每个分类的预设网站列表 |
| `schedule` | `id`（字符串） | 调度配置 |
| `auth` | `category`（字符串） | 每个分类的密码哈希 |
| `unlockState` | `category`（字符串） | 每个分类的解锁状态 |
| `stats` | `date`（字符串） | 每日统计记录 |
| `settings` | `key`（字符串） | 全局键值设置 |

**替代方案：**

- `chrome.storage.local` → 拒绝：单键大小限制（~8KB），无查询能力，无事务
- 各包自己的 IndexedDB → 拒绝：schema 冲突，迁移协调噩梦
- Dexie.js 封装 → 接受：简化 IndexedDB API，内置版本管理和迁移

### 3. 事件总线：混合类型化 + chrome.runtime

同上下文（如 popup 内 React 组件间）：使用类型化的 `EventEmitter` 做 pub/sub。
跨上下文（popup ↔ background service worker）：使用 `chrome.runtime.sendMessage` + 类型安全 wrapper，共享同一套类型定义。

```
┌─────────────────────────────────────────────────────┐
│                  EventBus API                        │
├─────────────────────────────────────────────────────┤
│  emit(event, payload)     — 发后即忘                  │
│  on(event, handler)       — 订阅                     │
│  off(event, handler)      — 取消订阅                  │
│  request(event, payload)  — 请求/响应（异步）          │
│  respond(event, handler)  — 处理请求                  │
└─────────────────────────────────────────────────────┘
```

事件定义在 `@blocksite/core` 中作为类型化 map，确保所有发布者和订阅者就 payload 类型达成一致。

### 4. 设计系统：方案 C（暗色优先极简）

**调色板：**

| Token        | 亮色     | 暗色     |
| ------------ | -------- | -------- |
| 表面（背景） | Zinc-50  | Zinc-900 |
| 表面（备选） | Zinc-100 | Zinc-800 |
| 边框         | Zinc-200 | Zinc-700 |
| 文字（主）   | Zinc-900 | Zinc-50  |
| 文字（次要） | Zinc-500 | Zinc-400 |
| 强调色       | Lime-300 | Lime-300 |

**分类颜色（暗色背景下高饱和度）：**

| 分类   | 颜色                 | HSL           |
| ------ | -------------------- | ------------- |
| 社交   | Blue-400 `#60A5FA`   | `213,94%,68%` |
| 视频   | Red-400 `#F87171`    | `0,91%,71%`   |
| 游戏   | Green-400 `#4ADE80`  | `152,68%,57%` |
| 新闻   | Amber-400 `#FBBF24`  | `42,96%,56%`  |
| 成人   | Purple-400 `#C084FC` | `270,97%,75%` |
| 自定义 | Indigo-400 `#818CF8` | `232,87%,74%` |

**排版：**

- UI 文本：系统字体栈（`system-ui, -apple-system, sans-serif`）+ PingFang SC / Microsoft YaHei
- 代码块（正则输入、导出预览）：Geist Mono 或 JetBrains Mono

**动效 Token：**

- 微交互：150ms ease-out
- 页面过渡：200ms ease-in-out
- 装饰（光晕、渐变变化）：400-800ms

**组件：** shadcn/ui（Radix 原语 + Tailwind 样式）。内置 a11y（键盘导航、ARIA、焦点管理）。

**图标：** Lucide（描边风格，匹配暗色极简美学）。

**图表：** Recharts（声明式 React API，良好暗色模式支持）。

### 5. 国际化 (i18n)

使用 Chrome WebExtension 内置的 `chrome.i18n` API。所有用户可见文本存放在 `_locales/<lang>/messages.json` 文件中。

**支持的语言（最低）：**

- `en` — 英文（默认回退）
- `zh_CN` — 简体中文

**键名约定：** 按功能域用点分隔的层级键：

```
appName, appDescription           → 清单字段
common.save, common.cancel, ...   → 共享 UI
popup.blockThisSite, popup.*      → 弹窗页面
options.rules, options.*          → 设置页面
blocked.siteBlocked, blocked.*    → 拦截页面
dashboard.*                       → 仪表盘页面
category.social, category.*       → 分类显示名
ruleType.domain, ruleType.*       → 拦截类型标签
quote.social.1, quote.*           → 励志语录
```

**分类标签：** IndexedDB 中按 key 存储（如 `social`），渲染时通过 `chrome.i18n.getMessage('category.social')` 解析为显示文本。

**默认语录：** 按语言本地化，存储在 `_locales/<lang>/messages.json` 中。每个分类在每种支持语言中有 5 条默认语录。

**清单字符串：** `name` 和 `description` 使用 `__MSG_appName__` 和 `__MSG_appDescription__` 占位符。

**语言检测：** 首次运行时使用 `chrome.i18n.getAcceptLanguages()` 或 `navigator.language`。如果检测到的语言不在支持列表中，回退到 `en`。用户可在设置中覆盖。

**替代方案：**

- 第三方 i18n 库（i18next、react-intl）→ 拒绝：增加包体积，Chrome 内置 API 已足够
- 在 IndexedDB 中存储翻译 → 拒绝：语言文件作为静态 JSON 更简单，加载更快，且受益于 Chrome 内置缓存

### 6. Service Worker 架构

后台 service worker 管理：

- DNR 规则同步（基于状态应用/清除规则）
- **重定向拦截**：DNR `requestDomains` 仅匹配初始请求域名，无法拦截重定向链。Service worker 通过 `webNavigation.onBeforeNavigate` / `onCommitted` 监听导航事件，检测最终到达域名是否被拦截，若是则重定向到拦截页面
- 调度定时器（alarms API 用于多时段 + 番茄钟）
- 解锁定时器管理（setTimeout 用于到期，alarms 用于续期提醒）
- 统计记录（拦截页面加载时记录）

在 `chrome.runtime.onInstalled` 和 `chrome.runtime.onStartup` 时初始化，通过 storage 包从 IndexedDB 恢复状态。

### 7. TypeScript + oxlint：最严格配置

所有 TypeScript strict 系列标志和 oxlint 类别在最高严重级别启用（error，非 warn）。配置分层，以便在需要时每个包可以选择退出严格标志。

**tsconfig 分层：**

```
tsconfig.base.json              ← 共享：target, module, paths, jsx, moduleResolution
  └── tsconfig.strict.json      ← 所有严格标志
        ├── tsconfig.json          （根，extends strict）
        ├── packages/core/tsconfig.json
        └── ...（所有包）
```

**tsconfig.strict.json — 严格标志：**

| 标志                                 | 值      |
| ------------------------------------ | ------- |
| `strict`                             | `true`  |
| `noUncheckedIndexedAccess`           | `true`  |
| `exactOptionalPropertyTypes`         | `true`  |
| `noUnusedLocals`                     | `true`  |
| `noUnusedParameters`                 | `true`  |
| `noPropertyAccessFromIndexSignature` | `true`  |
| `noImplicitReturns`                  | `true`  |
| `noFallthroughCasesInSwitch`         | `true`  |
| `noImplicitOverride`                 | `true`  |
| `noUncheckedSideEffectImports`       | `true`  |
| `isolatedModules`                    | `true`  |
| `verbatimModuleSyntax`               | `true`  |
| `allowUnreachableCode`               | `false` |
| `allowUnusedLabels`                  | `false` |
| `noErrorTruncation`                  | `true`  |

**oxlint 配置（`.oxlintrc.json`）：**

所有类别在 `error` 级别启用：`correctness`、`suspicious`、`pedantic`、`style`、`nursery`、`perf`、`restriction`

**pre-commit hook（simple-git-hooks）：**

1. `oxfmt --check` — 格式验证
2. `oxlint` — lint 检查
3. `vitest run --changed` — 只跑受影响的测试

### 8. 测试策略

每个包有 `__tests__/` 目录：

- 所有公开方法的单元测试
- 边界情况覆盖：空输入、边界值、并发操作、错误路径
- Storage 包测试使用 `fake-indexeddb`

Vitest 配置在根级别，支持按包覆盖。

**CI 管线（GitHub Actions）：**

1. `pnpm install`
2. `oxfmt --check`
3. `oxlint`
4. `vitest run`
5. `pnpm build`

## 风险 / 权衡

- **IndexedDB 复杂度**：比 `chrome.storage.local` API 面更大，未来变更需要 schema 迁移，service worker 生命周期（空闲终止）意味着存储连接必须短命。→ 缓解：Dexie.js 简化 API；service worker 中按操作开关连接。
- **10 个包的开销**：更多 `package.json` 文件、构建配置和跨包版本管理。→ 缓解：pnpm workspace 自动处理链接；包仅内部使用（不发布到 npm）。
- **shadcn/ui 在扩展中**：组件需要手动复制和更新。→ 缓解：只复制实际使用的组件。
- **Service worker 中的 IndexedDB**：Firefox 和 Safari 的不同实现。→ 缓解：尽早跨浏览器测试；IndexedDB 不可用时回退到 `chrome.storage.local`。
- **DNR 规则限制**：Chrome 允许 5000 条动态规则，通配符和正则规则不是 1:1 映射。→ 缓解：接近限制时在 UI 中显示警告。
