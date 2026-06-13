## 实现任务

### 1. 创建 `@blocksite/ai` 包 ✅

**文件**: `packages/ai/package.json`, `packages/ai/tsconfig.json`, `packages/ai/src/index.ts`

- [x] 按 monorepo 标准格式创建包
- [x] 依赖 `@blocksite/core` 和 `@blocksite/storage`
- [x] 在 `tsconfig.base.json` 和 `vitest.config.ts` 中注册路径别名
- [x] 在 `wxt.config.ts` 中添加 Vite resolve alias

### 2. AI 类型和常量 ✅

**文件**: `packages/ai/src/types.ts`, `packages/ai/src/constants.ts`

- [x] `AIProvider` 联合类型（anthropic/openai/ollama/openrouter/deepseek）
- [x] `ApiKeyRecord`、`ChatMessage`、`CategorizationResult` 等类型
- [x] `MissingApiKeyError`、`AIProviderError`、`AIParseError` 错误类
- [x] `PROVIDER_INFO_LIST` 包含 5 个提供商的名称、描述、默认模型
- [x] `AICallLog` 调用记录类型

### 3. `apiKeys` 存储层 ✅

**文件**: `packages/storage/src/db.ts`, `stores.ts`, `index.ts`

- [x] Dexie 表 `apiKeys: "provider"`
- [x] `apiKeysStore` (get/getAll/put/remove)
- [x] `apiKeys` 公开 API 含 chrome.storage.local fallback

### 4. 提示词模板 ✅

**文件**: `packages/ai/src/prompts.ts`

- [x] `categorizeSitePrompt` — URL 分类
- [x] `generateQuotePrompt` — 名言生成
- [x] `parseNLRulePrompt` — NL 解析（要求 AI 生成全面规则）
- [x] `analyzeStatsPrompt` — 统计解读
- [x] `classifyUrlPrompt` — URL + 标题 + 正文内容智能分类

### 5. 提供商抽象层 ✅

**文件**: `packages/ai/src/providers.ts`

- [x] `ProviderClient` 接口 + 5 个实现（Anthropic/OpenAI/Ollama/OpenRouter/DeepSeek）
- [x] `callAI(provider, model, messages, feature)` 统一入口
- [x] 自动记录每次调用到 `aiCallLogs`
- [x] 保留最近 200 条记录

### 6. 功能函数 ✅

**文件**: `packages/ai/src/categorize.ts`, `generate-quote.ts`, `parse-nl-rule.ts`, `analyze-stats.ts`, `classify-url.ts`, `shared.ts`

- [x] `categorizeSite(url)` — 返回分类、置信度、理由
- [x] `generateQuote(category)` — 返回名言文本和作者
- [x] `parseNaturalLanguageRule(input)` — NL → 结构化规则列表
- [x] `analyzeStats(from, to)` — 返回洞察列表
- [x] `classifyUrl(url, title, descriptions, content?)` — 智能拦截判断
- [x] `getAIConfig()` — 从 settings 读取默认提供商和模型

### 7. 后台消息处理器 ✅

**文件**: `entrypoints/background.ts`

- [x] `ai:categorize` — 自动分类
- [x] `ai:generateQuote` — 名言生成
- [x] `ai:parseNLRule` — NL 解析
- [x] `ai:analyzeStats` — 统计洞察
- [x] `ai:setApiKey` / `ai:getApiKeys` / `ai:removeApiKey` — Key 管理
- [x] `ai:testConnection` — 连接测试
- [x] `ai:getFeatureConfig` / `ai:setFeatureConfig` — 功能开关（merge 模式）
- [x] `ai:getSmartRules` / `ai:addSmartRule` / `ai:removeSmartRule` / `ai:toggleSmartRule` — 智能规则 CRUD
- [x] `ai:classifyUrl` — 智能 URL 分类
- [x] `ai:getCallLogs` / `ai:clearCallLogs` — 调用记录

### 8. 智能动态拦截 ✅

**文件**: `entrypoints/background.ts`

- [x] `handleSmartBlock(tabId, url)` — 检查智能规则
- [x] 内存缓存 `aiBlockCache` Map
- [x] 提取页面正文（`chrome.scripting.executeScript` + `document.body.innerText`）
- [x] 拦截后自动添加域名到 DNR 规则
- [x] `redirectToBlocked` 工具函数

### 9. Options AI 标签页 ✅

**文件**: `entrypoints/options/App.tsx`

- [x] 侧边栏 TAB_KEYS 添加 "ai"
- [x] `AIPanel` 组件：
  - API Key 管理（提供商选择、Key 输入、Base URL、模型选择、Test/Save/Remove）
  - 已配置提供商列表
  - AI 功能开关（自动分类、AI 名言、NL 规则、统计洞察）
  - 调用记录面板（Show/Hide、Clear、调用列表含中文功能名）
- [x] `FeatureToggleRow` 子组件

### 10. Popup AI 自动分类 ✅

**文件**: `entrypoints/popup/App.tsx`

- [x] `fetchAiCategory(url)` 异步调用
- [x] AI 加载中状态（spinner + "AI 正在建议分类..."）
- [x] 分类建议 Badge（"AI 匹配: 95%"）
- [x] 自动设置 AI 建议的分类

### 11. Rules 面板 NL 输入 + 智能规则 ✅

**文件**: `entrypoints/options/App.tsx`

- [x] NL 输入框 + AI 解析按钮
- [x] `handleNlParse` — 解析 NL → 生成静态规则 + 智能规则
- [x] 解析结果列表含一键添加全部 / 逐条添加
- [x] 智能规则列表（绿色高亮区域，含开关和删除）
- [x] `toggleSmartRule` / `removeSmartRule`

### 12. Dashboard AI Insights ✅

**文件**: `entrypoints/dashboard/App.tsx`

- [x] `loadInsights()` 异步获取
- [x] AI Insights 面板在统计卡片下方
- [x] `InsightCard` 组件（severity 着色：info/warning/suggestion）
- [x] 加载中状态 + 无数据降级

### 13. Blocked 页面 AI 名言 ✅

**文件**: `entrypoints/blocked/App.tsx`

- [x] `fetchAiQuote(category)` 异步获取
- [x] AI 名言优先于静态名言
- [x] 显示作者署名
- [x] 失败降级到静态名言

### 14. i18n 国际化 ✅

**文件**: `_locales/en/messages.json`, `_locales/zh_CN/messages.json`

- [x] 42 个 AI 专用 key（Options/Popup/Dashboard/智能规则）
- [x] 所有 UI 字符串使用 `t()` 调用
- [x] 功能名显示中文

### 15. DNR 域名规则修复 ✅

**文件**: `packages/rules/src/index.ts`

- [x] `requestDomains` 同时包含 `domain.com` 和 `www.domain.com`

### 16. 权限 ✅

**文件**: `wxt.config.ts`

- [x] 添加 `"scripting"` 权限（页面正文提取）
- [x] 添加 `"webNavigation"` 权限（已有）

### 17. 测试 ✅

**文件**: `packages/ai/__tests__/`

- [x] `prompts.test.ts` (7 tests) — 提示词结构验证
- [x] `providers.test.ts` (6 tests) — 提供商逻辑和错误处理
- [x] `categorize.test.ts` (4 tests) — 分类解析和边界情况
- [x] `generate-quote.test.ts` (2 tests) — 名言生成
- [x] `parse-nl-rule.test.ts` (4 tests) — NL 解析和验证
- [x] `analyze-stats.test.ts` (3 tests) — 统计分析和空数据处理
- [x] 总计 26 个新测试，全部 74 通过

### 验证

- [x] `pnpm format` — 通过
- [x] `pnpm lint` — 0 errors, 2 pre-existing warnings
- [x] `pnpm test` — 74 tests passed (48 existing + 26 new)
- [x] `pnpm build` — ~532KB, 成功
- [x] `views` — 测试成功 → 配 DeepSeek Key → 所有 AI 功能正常
