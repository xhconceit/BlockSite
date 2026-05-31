# BlockSite

浏览器网站拦截插件 — 帮助你保持专注。

支持域名、路径、关键词、正则四种拦截方式，分类拦截页面展示励志语录，定时开关 + 密码保护，全平台兼容（Chrome / Firefox / Safari）。

## 功能

| 功能 | 说明 |
|------|------|
| 多种拦截方式 | 域名、URL 路径、关键词、正则表达式 |
| 分类拦截页 | 社交/视频/游戏/新闻/成人/自定义，每类不同主题色和励志语录 |
| 临时解锁 | 5 分钟临时解锁 + 倒计时，可选密码验证 |
| 定时拦截 | 按工作日 + 时间段自动开关 |
| 密码保护 | SHA-256 哈希存储，修改设置和临时解锁需验证 |
| 分类预设 | 一键添加社交、视频、游戏、新闻等常见网站拦截规则 |
| 导入导出 | JSON 格式备份和迁移配置 |
| 拦截统计 | 今日拦截次数 + 总次数 |

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式 (Chrome，自动热重载)
pnpm dev

# 开发模式 (Firefox)
pnpm dev:firefox

# 构建
pnpm build           # Chrome MV3 → .output/chrome-mv3
pnpm build:firefox   # Firefox MV2 → .output/firefox-mv2
pnpm build:safari    # Safari MV3

# 打包
pnpm zip             # Chrome 商店 zip
pnpm zip:firefox     # Firefox 商店 zip
```

## 加载插件

**Chrome**: `chrome://extensions` → 「加载已解压的扩展程序」→ 选择 `.output/chrome-mv3`

**Firefox**: `about:debugging` → 「临时载入附加组件」→ 选择 `.output/firefox-mv2/manifest.json`

## 技术栈

[WXT](https://wxt.dev) · React 19 · TypeScript · Tailwind CSS v4 · declarativeNetRequest · chrome.storage

## 项目结构

```
entrypoints/     UI 入口 (popup / options / blocked) + background.ts
lib/             纯逻辑，不依赖 React
hooks/           React Hooks，桥接 lib 层和 UI 组件
components/      UI (ui/ 通用 + 业务组件)
utils/           工具函数
types/           全局类型定义
```
