## 为什么

v1 BlockSite 扩展是功能性的 MVP，但每层都有根本性问题：用 `chrome.storage.local` 做单体存储、组件紧耦合、UI 粗糙、没有测试。与其逐步修补，不如彻底重来——解耦的包架构、IndexedDB 存储、暗色优先的设计、完整测试覆盖。

## 变更内容

**拦截引擎：**

- 新增通配符模式（`*.example.com`）
- 正则表达式实时匹配预览
- 保留域名、路径、关键词、正则四种模式
- 重定向拦截：通过短链接、代理、多层跳转访问被拦截域名时同样拦截

**规则管理：**

- 批量启用/禁用/删除
- 拖拽排序
- 按类型和分类搜索筛选

**分类预设：**

- 用户可编辑每个分类的预设网站（增删）
- 五个内置分类：社交、视频、游戏、新闻、成人 + 自定义

**拦截页面：**

- 每个分类可自定义页面外观
- 显示拦截次数
- 分类主题色 + 丰富动效
- 励志语录与分类上下文相关

**临时解锁：**

- 自定义解锁时长
- 强制密码验证
- 每个分类独立控制解锁权限
- 每日解锁次数限制
- 到期前提醒 + 续期机制

**全局控制：**

- 全局开关 + 定时自动恢复（N 分钟后自动开启）
- 增强快捷添加：可选分类和自定义备注
- Popup 信息面板：今日拦截数、活跃规则数、倒计时、下次调度时间

**定时拦截：**

- 每天多个时间段
- 番茄钟模式（工作/休息循环）
- 特殊日期排除（节假日、自定义日期）

**密码保护：**

- 每个分类独立设置密码
- SHA-256 哈希存储

**统计：**

- 按分类、按时段、按规则、趋势对比
- 独立 Dashboard 页面 + Recharts 图表

**数据管理：**

- IndexedDB 存储 **BREAKING**：替换 `chrome.storage.local`，v1 配置不兼容
- 选择性 JSON 导出
- JSON 导入 + 校验

**国际化：**

- Chrome WebExtension i18n，`_locales/<lang>/messages.json`
- 最低支持英文（en）和简体中文（zh_CN）
- 所有 UI 文本外部化，分类标签和语录按语言本地化
- 自动检测浏览器语言，支持手动切换

**架构：**

- pnpm workspace monorepo，10 个解耦包
- 集中式 storage 包作为 IndexedDB 唯一入口
- 混合类型化事件总线（同上下文 emitter + 跨上下文 chrome.runtime wrapper）
- 所有方法 100% 单元测试覆盖，覆盖所有边界情况

**工程：**

- WXT + React 19 + TypeScript + Tailwind CSS
- shadcn/ui 组件系统
- Vitest + oxfmt + oxlint + simple-git-hooks + GitHub Actions CI

## 能力

### 新能力

- `rule-management`：拦截规则 CRUD，5 种匹配类型（域名、路径、关键词、正则、通配符），批量操作，拖拽排序，搜索筛选
- `category-presets`：每个分类可编辑的预设网站集合，用户可增删预设条目
- `blocked-page`：可自定义的拦截页面，按分类主题化，拦截统计展示，语录和解锁控制
- `unlock-system`：临时解锁，强制密码，可配时长，按分类控制，每日限制，到期续期
- `global-control`：全局开关 + 自动恢复定时器，快捷添加当前站点（可选分类和备注），Popup 信息面板
- `schedule-system`：多时段调度，番茄钟模式，特殊日期排除，按星期选择
- `password-protection`：按分类设置密码，SHA-256 哈希
- `statistics-dashboard`：详细拦截统计 + 图表（按分类、时段、规则、趋势对比），独立 Dashboard 页面
- `data-management`：IndexedDB 存储层，选择性 JSON 导入导出 + 校验
- `event-bus`：类型化跨上下文消息总线，用于解耦包间通信
- `i18n`：多语言支持，Chrome WebExtension i18n API，外部化语言文件，浏览器语言自动检测

### 修改的能力

<!-- 无现有能力需修改 — 此为完全重建 -->

## 影响

- **仓库**：所有源文件替换。新 monorepo 结构，`packages/` 和 `entrypoints/`。
- **存储**：**BREAKING** — `chrome.storage.local` 替换为 IndexedDB。不提供 v1 迁移路径。
- **依赖**：新增 shadcn/ui、Radix UI、Recharts、Lucide、Dexie.js、Vitest、oxfmt、oxlint。
- **构建**：WXT 继续作为构建工具。pnpm workspace 替换扁平结构。
- **CI**：新增 GitHub Actions 工作流（格式 → lint → 测试 → 构建）。
