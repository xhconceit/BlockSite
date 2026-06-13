## AI 功能规格

### Requirement: AI 提供商管理

系统应支持多个 AI 提供商，用户可在 Options → AI 标签页配置 API Key。

提供商列表：

- Anthropic (Claude models)
- OpenAI (GPT models)
- DeepSeek (deepseek-v4-pro, deepseek-v4-flash 等)
- Ollama (本地自托管)
- OpenRouter (多提供商网关)

API Key 存储在独立的 `apiKeys` IndexedDB 表中（与 `auth` 密码表同模式），通过后台消息处理器读写，UI 页面永远不接触原始 Key。

#### Scenario: 添加 API Key

- **WHEN** 用户在 AI 标签页选择提供商、输入 API Key、点击 Save Key
- **THEN** 系统将 Key 存入 `apiKeys` 表，同时将该提供商设为默认
- **AND** UI 显示已配置的提供商列表，Key 以 `••••sk-xxx` 格式掩码

#### Scenario: 测试连接

- **WHEN** 用户点击 Test Connection
- **THEN** 系统用所选提供商发送一条简单请求
- **AND** 显示 "Connected!" 或错误信息

#### Scenario: 删除 API Key

- **WHEN** 用户点击 Remove Key
- **THEN** 系统从 `apiKeys` 表删除该提供商的 Key
- **AND** 后续 AI 调用不再使用该提供商

### Requirement: AI 自动分类

打开 Popup 时，系统应自动调用 AI 分析当前页面 URL，建议最合适的分类。

#### Scenario: 分类建议

- **WHEN** 用户在未拦截的网站上打开 Popup
- **THEN** 系统调用 AI 分析 URL 并返回分类建议和置信度
- **AND** 分类选择器旁显示 AI 建议标签（如 "AI: 95% match"）
- **AND** 分类选择器自动设为 AI 建议的分类

#### Scenario: AI 不可用时的降级

- **WHEN** AI API Key 未配置或调用失败
- **THEN** 系统静默降级为手动分类，不显示 AI 建议标签
- **AND** 不弹出错误提示

### Requirement: 自然语言规则创建

Rules 面板应支持用自然语言描述拦截意图，AI 解析为具体域名规则。

#### Scenario: NL 解析生成规则

- **WHEN** 用户输入 "拦截所有社交媒体" 并点击 AI 解析
- **THEN** AI 返回 facebook.com、twitter.com、instagram.com 等 15+ 个域名规则
- **AND** 显示解析结果列表，可一键添加全部或逐条添加
- **AND** AI 生成规则会自动去重（跳过已有规则）

#### Scenario: NL 创建智能规则

- **WHEN** 用户输入拦截描述并点击 AI 解析
- **THEN** 同时自动创建一条智能规则（动态拦截）
- **AND** 智能规则显示在绿色高亮区域，可单独开关/删除

### Requirement: 智能动态拦截

智能规则应在用户浏览时动态生效——AI 实时分析访问的网页，判断是否匹配拦截意图。

#### Scenario: 首次访问匹配网站

- **WHEN** 有活跃智能规则且用户首次访问某域名
- **THEN** 系统提取页面 URL + 标题 + 正文前 2000 字符
- **AND** 调用 AI 判断是否匹配任何活跃智能规则
- **AND** 若匹配则跳转到拦截页面，并将该域名加入静态 DNR 规则（后续秒拦）
- **AND** 结果缓存在内存中（同域名后续直接命中缓存）
- **AND** 若不匹配则放行

#### Scenario: 缓存命中

- **WHEN** 有活跃智能规则且用户访问已缓存的域名
- **THEN** 直接从内存缓存读取判断结果，不调用 AI
- **AND** 若之前判断为拦截，立即跳转到拦截页面

#### Scenario: 无智能规则时

- **WHEN** 没有活跃的智能规则
- **THEN** 系统不触发任何 AI 调用
- **AND** 网站正常加载

### Requirement: AI 生成名言

拦截页面应支持 AI 动态生成个性化名言。

#### Scenario: AI 名言生成

- **WHEN** 用户访问被拦截的网站且该规则没有自定义消息
- **THEN** 系统调用 AI 根据分类和当日拦截次数生成个性化名言
- **AND** 显示 AI 名言和作者署名

#### Scenario: AI 不可用时降级

- **WHEN** AI 调用失败或未配置
- **THEN** 系统降级显示静态预设名言
- **AND** 不显示 AI 签名

### Requirement: AI 统计洞察

Dashboard 应包含 AI 分析面板，解读用户拦截数据并给出建议。

#### Scenario: 统计洞察

- **WHEN** Dashboard 加载完成且有拦截数据
- **THEN** AI 分析拦截趋势、高峰期、最常拦截分类
- **AND** 生成最多 5 条洞察建议（标记 severity: info/warning/suggestion）
- **AND** 每条 insight 包含是否可执行的标记

#### Scenario: 无数据时的降级

- **WHEN** 没有拦截数据
- **THEN** 不显示 AI Insights 面板
- **AND** 不调用 AI

### Requirement: AI 调用记录

AI 标签页应显示所有 AI 调用历史。

#### Scenario: 查看调用记录

- **WHEN** 用户在 AI 标签页点击 Show
- **THEN** 系统展示最近 50 条调用记录
- **AND** 每条记录显示：时间、功能名（中文）、提供商、成功/失败、输出摘要
- **AND** 记录按时间倒序排列

#### Scenario: 清空记录

- **WHEN** 用户点击 Clear
- **THEN** 系统清空所有调用记录

### Requirement: DNR 域名规则匹配

域名类型的 DNR 规则应同时匹配 `domain.com` 和 `www.domain.com`。

#### Scenario: www 子域名匹配

- **WHEN** 用户添加 domain 规则值为 `facebook.com`
- **THEN** DNR 规则 `requestDomains` 包含 `["facebook.com", "www.facebook.com"]`
- **AND** 用户访问 `https://www.facebook.com` 时被正确拦截

#### Scenario: 用户输入的 www 前缀

- **WHEN** 用户输入 `www.4khd.com` 作为域名规则
- **THEN** 系统自动去除 `www.` 前缀
- **AND** DNR 规则仍然包含 `["4khd.com", "www.4khd.com"]`
