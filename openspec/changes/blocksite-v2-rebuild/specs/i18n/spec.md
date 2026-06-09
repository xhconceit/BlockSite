## 新增需求

### Requirement: 多语言支持

系统应支持多种显示语言。所有用户可见文本应外置到语言文件中。系统应在首次运行时检测浏览器语言偏好并默认使用，当检测到的语言不支持时回退到英文。

#### Scenario: 自动检测浏览器语言

- **WHEN** 扩展安装且浏览器语言为 `zh-CN`
- **THEN** UI 以简体中文显示

#### Scenario: 回退到英文

- **WHEN** 扩展安装且浏览器语言为 `ja-JP`（不支持的语言）
- **THEN** UI 以英文显示

#### Scenario: 用户手动切换语言

- **WHEN** 用户在设置中选择另一语言
- **THEN** 所有扩展页面立即切换到新语言

### Requirement: 语言资源文件

翻译字符串应按 Chrome WebExtension i18n 结构存储在 `_locales/` 目录下每个语言文件夹的 JSON 文件中。每个语言应有 `messages.json` 文件。系统应通过 Chrome i18n API 支持占位符和复数形式。

最低支持的语言：

- `en` — 英文（默认回退）
- `zh_CN` — 简体中文

#### Scenario: Chrome i18n 目录结构

- **WHEN** 扩展构建
- **THEN** `_locales/en/messages.json` 和 `_locales/zh_CN/messages.json` 被包含在输出中

#### Scenario: 占位符替换

- **WHEN** 消息中包含 `$RULE_COUNT$` 占位符
- **THEN** 渲染的文本将 `$RULE_COUNT$` 替换为实际数值

### Requirement: i18n 键名约定

翻译键应使用点分隔的层级名称，按功能域组织。每个键应有描述性的英文名称。

键结构：

- `appName` — 扩展名称
- `appDescription` — 扩展描述
- `popup.*` — 弹窗页面文本
- `options.*` — 设置页面文本
- `blocked.*` — 拦截页面文本
- `dashboard.*` — 仪表盘页面文本
- `category.*` — 分类名称
- `ruleType.*` — 拦截类型标签
- `quote.*` — 励志语录（每个分类）
- `common.*` — 共享 UI 文本（保存、取消、删除等）

#### Scenario: 键查找

- **WHEN** UI 需要显示社交分类名称
- **THEN** 它使用键 `category.social`，英文解析为 "Social Media"，中文解析为 "社交媒体"

### Requirement: 预定义消息替换

UI 组件中所有硬编码字符串应替换为 `chrome.i18n.getMessage(key, substitutions)` 调用。manifest 应为本地化字段使用 `__MSG_key__` 占位符。

#### Scenario: Manifest 本地化

- **WHEN** 扩展在中文浏览器中加载
- **THEN** manifest 的 `name` 和 `description` 字段使用 `__MSG_appName__` 和 `__MSG_appDescription__` 占位符，解析为中文

#### Scenario: UI 文本本地化

- **WHEN** popup 渲染"拦截此站点"按钮
- **THEN** 它调用 `chrome.i18n.getMessage('popup.blockThisSite')`，中文返回"拦截此站点"

### Requirement: 分类语录本地化

默认励志语录应按语言本地化。每个语言应提供该语言下的分类相关语录。如果用户编辑了语录，自定义文本不应被自动翻译。

#### Scenario: 游戏分类中文语录

- **WHEN** 语言为 `zh_CN` 且游戏分类规则拦截了网站
- **THEN** 拦截页面显示与游戏相关的中文语录（如"通关的人生不在游戏里"）

#### Scenario: 游戏分类英文语录

- **WHEN** 语言为 `en` 且游戏分类规则拦截了网站
- **THEN** 拦截页面显示与游戏相关的英文语录（如 "Achievements in games don't appear on your resume"）

### Requirement: IndexedDB 中的 i18n

分类元数据（标签、主题色）应在 IndexedDB 中以语言无关的键存储。显示标签应在 UI 渲染时通过 `chrome.i18n.getMessage()` 解析。用户创建的内容（自定义消息、自定义分类名称）应按原样存储，不翻译。

#### Scenario: 分类按键存储

- **WHEN** 规则以分类 `social` 保存
- **THEN** 数据库存储分类键 `social`，而非显示标签

#### Scenario: UI 渲染时解析标签

- **WHEN** popup 渲染分类筛选下拉菜单
- **THEN** `social` 的标签通过 `chrome.i18n.getMessage('category.social')` 解析为 "Social Media"（en）或 "社交媒体"（zh_CN）
