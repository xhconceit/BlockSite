# BlockSite 技术文档

## 1. 技术栈

| 层 | 技术 | 版本 | 用途 |
|----|------|------|------|
| 框架 | WXT | ^0.20 | 浏览器插件开发框架，跨平台构建 |
| UI | React | ^19.1 | 组件化 UI 开发 |
| 语言 | TypeScript | ^5.8 | 类型安全 |
| 样式 | Tailwind CSS | ^4.1 | 原子化 CSS |
| 构建 | Vite | ^8.0 | WXT 内置，HMR 开发 |
| 包管理 | pnpm | ^10 | 依赖管理 |
| 存储 | chrome.storage.local | - | 本地持久化 |
| 拦截 | declarativeNetRequest | - | Chrome MV3 网络层拦截 |
| 定时 | chrome.alarms | - | 定时任务调度 |
| 密码 | SubtleCrypto (SHA-256) | - | 浏览器内置加密 |

## 2. 项目结构

```
BlockSite/
├── wxt.config.ts                # WXT 框架配置
├── package.json
├── tsconfig.json
├── postcss.config.js
│
├── public/
│   └── icons/                   # 插件图标 (16/48/128)
│
├── entrypoints/                 # WXT 入口点（自动生成对应 HTML）
│   ├── background.ts            # Service Worker
│   ├── popup/                   # 工具栏弹窗
│   │   ├── index.html
│   │   ├── main.tsx             # React 挂载入口
│   │   ├── App.tsx              # 弹窗主组件
│   │   └── style.css
│   ├── options/                 # 设置页面
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx              # 设置主组件
│   │   └── style.css
│   └── blocked/                 # 拦截展示页
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx              # 拦截页主组件
│       └── style.css
│
├── components/
│   ├── ui/                      # 通用 UI 组件库
│   │   ├── Button.tsx           # 按钮（primary/danger/ghost/outline）
│   │   ├── Input.tsx            # 输入框
│   │   ├── Toggle.tsx           # 开关切换
│   │   ├── Modal.tsx            # 模态框
│   │   ├── Tabs.tsx             # 标签页
│   │   ├── Select.tsx           # 下拉选择
│   │   ├── Badge.tsx            # 标签徽章
│   │   └── Toast.tsx            # 消息提示
│   ├── RuleForm.tsx             # 规则添加/编辑表单
│   ├── RuleList.tsx             # 规则列表（搜索/筛选/批量操作）
│   ├── RuleItem.tsx             # 单条规则展示
│   ├── ScheduleConfig.tsx       # 定时设置面板
│   ├── PasswordConfig.tsx       # 密码设置面板
│   ├── CategoryPresets.tsx      # 分类预设管理
│   └── ImportExport.tsx         # 导入导出
│
├── hooks/                       # 自定义 React Hooks
│   ├── useConfig.ts             # 全局配置读写
│   ├── useRules.ts              # 规则 CRUD + 搜索筛选
│   ├── useSchedule.ts           # 定时配置管理
│   ├── usePassword.ts           # 密码状态管理
│   ├── useBlockedItems.ts       # URL 匹配检测
│   └── useCurrentTab.ts         # 当前标签页信息
│
├── lib/                         # 纯逻辑模块（不依赖 React）
│   ├── storage.ts               # chrome.storage.local 封装
│   ├── rules.ts                 # declarativeNetRequest 规则生成
│   ├── scheduler.ts             # chrome.alarms 定时调度
│   ├── password.ts              # SHA-256 密码哈希
│   └── quotes.ts                # 励志语录库
│
├── utils/                       # 工具函数
│   ├── id.ts                    # UUID 生成
│   ├── url.ts                   # URL 解析（域名提取/模式匹配）
│   └── format.ts                # 时间日期格式化
│
└── types/                       # TypeScript 类型定义
    └── index.ts
```

## 3. 架构设计

### 3.1 分层架构

```
┌─────────────────────────────────────────────┐
│                  UI Layer                     │
│  popup/App  options/App  blocked/App         │
│  components/ (RuleForm, RuleList, ...)       │
├─────────────────────────────────────────────┤
│                Hooks Layer                    │
│  useConfig  useRules  useSchedule            │
│  usePassword  useBlockedItems  useCurrentTab │
├─────────────────────────────────────────────┤
│              Business Logic                   │
│  lib/storage  lib/rules  lib/scheduler       │
│  lib/password  lib/quotes                    │
├─────────────────────────────────────────────┤
│              Browser APIs                     │
│  chrome.storage  chrome.declarativeNetRequest │
│  chrome.alarms   chrome.tabs                 │
│  chrome.webNavigation  crypto.subtle         │
└─────────────────────────────────────────────┘
```

### 3.2 数据流

```
用户操作 (Popup/Options)
    │
    ▼
React State (Hooks)
    │
    ▼
lib/storage.ts → chrome.storage.local.set()
    │
    ▼
chrome.runtime.sendMessage() → Background Service Worker
    │
    ├──▶ lib/rules.ts → declarativeNetRequest.updateDynamicRules()
    │         │
    │         ▼
    │    浏览器网络层拦截
    │         │
    │         ▼
    │    blocked.html（拦截页面）
    │
    └──▶ lib/scheduler.ts → chrome.alarms.create()
              │
              ▼
         定时开关拦截
```

### 3.3 消息通信

Background Service Worker 与 UI 页面（popup/options/blocked）之间通过 `chrome.runtime.sendMessage` 通信：

| 消息类型 | 方向 | 说明 |
|----------|------|------|
| `getConfig` | UI → BG | 获取完整配置 |
| `updateRules` | UI → BG | 更新拦截规则 |
| `toggleEnabled` | UI → BG | 全局开关 |
| `tempUnlock` | UI → BG | 临时解锁 N 分钟 |
| `checkTempUnlock` | UI → BG | 检查临时解锁状态 |
| `updateSchedule` | UI → BG | 更新定时设置 |
| `updatePassword` | UI → BG | 更新密码设置 |
| `getBlockedUrl` | UI → BG | 获取被拦截 URL |
| `blockPageOpened` | UI → BG | 拦截页已打开（统计） |

## 4. 核心模块详解

### 4.1 规则管理 (lib/rules.ts)

将用户配置的 `BlockedItem[]` 转换为 `declarativeNetRequest.Rule[]`：

```ts
// 规则 ID 从 1000 起分配，避免与静态规则冲突
const RULE_ID_BASE = 1000;

// 域名拦截 → requestDomains
{ condition: { requestDomains: ['facebook.com'] } }

// 路径拦截 → regexFilter
{ condition: { regexFilter: '^https?://(www\\.)?youtube\\.com/shorts' } }

// 关键词拦截 → urlFilter
{ condition: { urlFilter: '*game*' } }

// 正则拦截 → regexFilter
{ condition: { regexFilter: '.*\\.torrent.*' } }
```

所有规则 action 为 `REDIRECT` → `/blocked.html?ruleId=xxx&category=xxx&customMessage=xxx`

### 4.2 定时调度 (lib/scheduler.ts)

```ts
// 使用 chrome.alarms API
chrome.alarms.create('blocksite_schedule_start', {
  when: startTime.getTime(),      // 精确到分钟
  periodInMinutes: 24 * 60,       // 每天一次
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'blocksite_schedule_start') → 开启拦截
  if (alarm.name === 'blocksite_schedule_end')   → 关闭拦截
});
```

### 4.3 密码安全 (lib/password.ts)

```ts
// SHA-256 哈希
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// 存储格式
{ passwordEnabled: true, passwordHash: 'abc123...' }
```

### 4.4 励志语录 (lib/quotes.ts)

```ts
// 每个分类 5 条语录 + 主题色
const quotes: Record<Category, { text: string; author: string }[]> = {
  social: [
    { text: '真正的社交不是点赞和评论...', author: '佚名' },
    // ...
  ],
  // ...
};

const themeColors: Record<Category, string> = {
  social: '#3b82f6',   // 蓝
  video: '#ef4444',    // 红
  game: '#22c55e',     // 绿
  news: '#f59e0b',     // 橙
  adult: '#8b5cf6',    // 紫
  custom: '#6366f1',   // 靛
};

// 随机获取
function getQuote(category?: Category): QuoteResult {
  const list = quotes[category || 'custom'];
  return list[Math.floor(Math.random() * list.length)];
}
```

### 4.5 拦截 URL 传递

由于 `declarativeNetRequest.extensionPath` 不支持 `{url}` 模板替换，采用 `webNavigation` 监听实现：

```
1. 用户访问 blocked.com
2. chrome.webNavigation.onBeforeNavigate 触发 → 存储 URL 到 Map<tabId, url>
3. declarativeNetRequest 规则匹配 → 重定向到 blocked.html
4. blocked.html 发送 blockPageOpened 消息 → Background 从 Map 查找 URL
5. Background 返回 { blockedUrl: '...' } + 更新统计
6. chrome.webNavigation.onCommitted 清理 Map
```

## 5. 数据存储

### 5.1 存储方案

使用 `chrome.storage.local`，单 key `blocksite_config`，存储完整配置 JSON。

### 5.2 数据结构

```ts
interface AppConfig {
  enabled: boolean;                    // 全局开关
  blockedItems: BlockedItem[];         // 拦截规则列表
  schedule: ScheduleConfig;            // 定时设置
  passwordEnabled: boolean;            // 密码是否启用
  passwordHash: string;                // SHA-256 哈希
  tempUnlockUntil: number | null;      // 临时解锁截止时间戳
  stats: BlockStats;                   // 拦截统计
}

interface BlockedItem {
  id: string;                          // UUID
  type: 'domain' | 'path' | 'keyword' | 'regex';
  value: string;                       // 拦截值
  enabled: boolean;                    // 单条开关
  category: Category;                  // 分类
  customMessage: string;               // 自定义提示
}

interface ScheduleConfig {
  enabled: boolean;
  startHour: number;                   // 0-23
  startMinute: number;                 // 0-59
  endHour: number;
  endMinute: number;
  days: number[];                      // 0=Sun..6=Sat
}
```

## 6. 构建配置

### 6.1 wxt.config.ts

```ts
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'BlockSite',
    permissions: [
      'declarativeNetRequest',
      'declarativeNetRequestWithHostAccess',
      'storage', 'alarms', 'tabs', 'webNavigation'
    ],
    host_permissions: ['<all_urls>'],
  },
});
```

### 6.2 构建命令

```bash
pnpm dev              # 开发模式 (Chrome)
pnpm dev:firefox      # 开发模式 (Firefox)
pnpm build            # 生产构建 (Chrome MV3)
pnpm build:firefox    # 生产构建 (Firefox MV2)
pnpm build:safari     # 生产构建 (Safari)
pnpm zip              # 打包为 Chrome 商店 zip
pnpm zip:firefox      # 打包为 Firefox 商店 zip
```

### 6.3 构建产物

```
.output/
├── chrome-mv3/       # Chrome/Edge 扩展
├── firefox-mv2/      # Firefox 扩展
└── safari-mv3/       # Safari 扩展
```

## 7. 安全考虑

| 方面 | 措施 |
|------|------|
| 密码存储 | SHA-256 哈希，不存明文 |
| 数据传输 | 所有数据仅存储在本地 chrome.storage |
| XSS | React 默认转义输出 |
| 权限最小化 | 仅申请必须的 6 个权限 |
| 外部资源 | 不加载任何外部脚本或 CDN |
