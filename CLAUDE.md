# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
pnpm dev              # 开发模式 (Chrome)，自动打开浏览器并热重载
pnpm dev:firefox      # 开发模式 (Firefox)
pnpm build            # 构建 Chrome MV3 → .output/chrome-mv3
pnpm build:firefox    # 构建 Firefox MV2 → .output/firefox-mv2
pnpm build:safari     # 构建 Safari MV3
pnpm zip              # 打包 Chrome 商店 zip
pnpm zip:firefox      # 打包 Firefox 商店 zip
```

构建后在 Chrome 加载：`chrome://extensions` → 「加载已解压的扩展程序」→ 选择 `.output/chrome-mv3`

## 架构

这是一个基于 [WXT](https://wxt.dev) 框架的浏览器扩展，React 19 + TypeScript + Tailwind CSS v4。

### 分层结构

```
entrypoints/     UI 入口 (popup / options / blocked) + background.ts
                   ↕ chrome.runtime.sendMessage (10 种消息类型)
lib/             纯逻辑，不依赖 React。storage / rules / scheduler / password / quotes
hooks/           React Hooks，桥接 lib 层和 UI 组件
components/      UI (ui/ 通用 + 业务组件)
utils/           工具函数 (id / url / format)
types/           全局类型定义 & 默认配置常量
```

### WXT 入口点

- **`entrypoints/background.ts`** — Service Worker。安装时初始化规则和闹钟；`onMessage` 处理 UI 命令；`webNavigation.onBeforeNavigate` 缓存被拦截 URL 供 blocked 页读取；`alarms.onAlarm` 处理定时开关
- **`entrypoints/popup/`** — 工具栏弹窗 (360px 宽)，全局开关 + 当前站点快速拦截
- **`entrypoints/options/`** — 全页设置，5 个 Tab：拦截列表 / 分类预设 / 定时 / 密码 / 导入导出。通过 `chrome.tabs.create` 在新标签页打开
- **`entrypoints/blocked/`** — 拦截展示页。DNR 规则重定向到此页面，根据 URL 参数中的 category 展示对应主题色和励志语录

### 拦截机制

`lib/rules.ts` 将用户配置的 `BlockedItem[]` 转为 `declarativeNetRequest.Rule[]`，规则 ID 从 1000 起分配：

| 拦截类型 | DNR 条件 |
|---------|---------|
| domain | `requestDomains` |
| path | `regexFilter` (拼接域名+路径为正则) |
| keyword | `urlFilter` (通配符 `*keyword*`) |
| regex | `regexFilter` (用户原始正则) |

所有规则 action 为 `REDIRECT` → `blocked.html?ruleId=...&category=...&customMessage=...`。由于 `extensionPath` 不支持 `{url}` 替换，被拦截的 URL 通过 `webNavigation.onBeforeNavigate` → `Map<tabId, url>` → `blockPageOpened` 消息传递。

### 消息类型 (Background ↔ UI)

`getConfig` / `updateRules` / `toggleEnabled` / `tempUnlock` / `checkTempUnlock` / `updateSchedule` / `updatePassword` / `setPassword` / `removePassword` / `getBlockedUrl` / `blockPageOpened`

### 存储

单 key `blocksite_config` 存入 `chrome.storage.local`，完整类型定义见 `types/index.ts` 的 `AppConfig`。

### Tailwind CSS v4

通过 PostCSS 插件 `@tailwindcss/postcss` 使用。配置通过 CSS 中的 `@theme` 指令完成（见各 `style.css`），无需 `tailwind.config.ts` 文件。
