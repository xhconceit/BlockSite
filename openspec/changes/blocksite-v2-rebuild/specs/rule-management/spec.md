## 新增需求

### Requirement: 重定向拦截

系统应将 DNR 规则应用于所有导航请求，包括经过重定向链到达被拦截域名的请求。当用户通过短链接、代理网站或其他重定向服务访问被拦截域名时，系统应检测并拦截最终到达被拦截域名的页面。

DNR `requestDomains` 仅匹配初始请求域名，因此系统应额外通过 `webNavigation` 监听器检测重定向链终点是否为被拦截域名，并在浏览器提交到被拦截域名前重定向到拦截页面。

#### Scenario: HTTP 重定向到被拦截域名

- **WHEN** 用户导航到 `short.link` 且服务器返回 302 重定向到 `facebook.com`
- **THEN** 系统在浏览器提交到 `facebook.com` 之前重定向到拦截页面

#### Scenario: JavaScript 重定向到被拦截域名

- **WHEN** 用户访问一个页面，页面通过 `window.location` 或 `meta refresh` 重定向到 `instagram.com`
- **THEN** 系统检测到重定向目标是被拦截域名并显示拦截页面

#### Scenario: 多层重定向链

- **WHEN** 用户导航到 `a.com` → 302 → `b.com` → 302 → `twitter.com`
- **THEN** 系统在重定向链终点检测到 `twitter.com` 被拦截并显示拦截页面

#### Scenario: 域名规则 DNR 直接匹配

- **WHEN** 用户直接导航到 `facebook.com`
- **THEN** DNR `requestDomains` 规则直接匹配并重定向到拦截页面，无需经过 webNavigation 检测

### Requirement: 拦截规则类型

系统应支持五种拦截规则类型：域名、路径、关键词、正则、通配符。

- **域名**：精确匹配域名，忽略 `www.` 前缀。值应为裸域名（如 `facebook.com`）。
- **路径**：匹配域名 + URL 路径前缀。值应为 `域名.tld/路径` 格式（如 `youtube.com/shorts`）。
- **关键词**：URL 中包含关键词即匹配。值应为任意非空字符串（如 `game`）。
- **正则**：通过 JavaScript 正则表达式匹配。值应为合法的正则模式字符串。
- **通配符**：通过 glob 模式匹配。值支持 `*`（任意字符）和 `?`（单个字符）通配符（如 `*.example.com`）。

#### Scenario: 添加域名规则

- **WHEN** 用户创建类型为 `domain`、值为 `facebook.com` 的规则
- **THEN** 系统存储该规则，`facebook.com` 和 `www.facebook.com` 上的所有 URL 均被拦截

#### Scenario: 添加通配符规则

- **WHEN** 用户创建类型为 `wildcard`、值为 `*.twitter.com` 的规则
- **THEN** 系统拦截 `x.twitter.com`、`api.twitter.com`，但不拦截 `twitter.com`

#### Scenario: 无效的正则被拒绝

- **WHEN** 用户创建类型为 `regex`、值为 `[unclosed` 的规则
- **THEN** 系统拒绝该规则并显示校验错误

#### Scenario: 空值被拒绝

- **WHEN** 用户创建值为空字符串的规则
- **THEN** 系统拒绝该规则并显示校验错误

### Requirement: 正则可视化

系统应在编辑正则规则时提供实时预览面板。预览应展示用户最近访问过的 URL 中匹配和不匹配该模式的示例，匹配项高亮显示。

#### Scenario: 实时匹配预览

- **WHEN** 用户输入正则模式 `.*\.torrent.*`
- **THEN** 预览面板实时更新，显示匹配和不匹配的示例 URL

#### Scenario: 无效正则反馈

- **WHEN** 用户输入无效的正则如 `[unclosed`
- **THEN** 预览面板显示语法错误信息及错误位置

### Requirement: 规则增删改查

系统应允许用户创建、查看、修改和删除拦截规则。每条规则应有：id、类型、值、启用状态、分类、自定义提示信息和排序索引。

#### Scenario: 编辑已有规则

- **WHEN** 用户修改已有规则的值
- **THEN** 更新后的规则被保存，拦截行为反映变更

#### Scenario: 删除规则

- **WHEN** 用户删除一条规则
- **THEN** 该规则从存储中移除，对应的 DNR 规则被清除

#### Scenario: 切换规则启用状态

- **WHEN** 用户将规则从启用切换为禁用
- **THEN** 规则保留在存储中，但其 DNR 规则被移除，对应网站不再被拦截

### Requirement: 批量操作

系统应支持选中多条规则并执行批量启用、禁用或删除。

#### Scenario: 批量删除

- **WHEN** 用户选中 3 条规则并点击"删除选中项"
- **THEN** 全部 3 条规则从存储中移除，对应的 DNR 规则被清除

#### Scenario: 批量切换

- **WHEN** 用户选中 5 条规则并点击"禁用选中项"
- **THEN** 全部 5 条规则设为禁用，对应的 DNR 规则被移除

#### Scenario: 全选

- **WHEN** 用户点击"全选"且可见 10 条规则
- **THEN** 全部 10 条规则被选中用于批量操作

### Requirement: 拖拽排序

系统应支持通过拖拽调整规则排序。每条规则应有排序索引决定其显示位置。排序不应影响拦截行为。

#### Scenario: 拖拽规则到新位置

- **WHEN** 用户将第 5 条规则拖拽到第 2 个位置
- **THEN** 规则顺序更新，列表视觉上反映新的排序

#### Scenario: 拖拽手柄交互

- **WHEN** 用户通过拖拽手柄图标开始拖拽
- **THEN** 显示视觉插入指示线，示意规则将被放置的位置

### Requirement: 编辑已有规则

系统应允许用户在添加规则的同一表单中编辑已有规则。点击编辑按钮时，表单应预填该规则当前的所有字段值（类型、值、分类、自定义消息）。保存时应更新已有规则而非创建新规则。

#### Scenario: 编辑规则值

- **WHEN** 用户点击某规则的编辑按钮，将值从 `facebook.com` 改为 `instagram.com`，点击保存
- **THEN** 该规则的值更新为 `instagram.com`，DNR 规则同步更新

#### Scenario: 编辑规则分类

- **WHEN** 用户编辑规则，将分类从"自定义"改为"社交"
- **THEN** 该规则的分类更新，拦截页面使用社交主题色

#### Scenario: 编辑表单预填

- **WHEN** 用户点击某规则的编辑按钮
- **THEN** 弹窗标题显示"Edit Rule"，类型、值、分类、自定义消息字段预填当前值

#### Scenario: 取消编辑

- **WHEN** 用户在编辑弹窗中点击取消
- **THEN** 规则保持不变，弹窗关闭

### Requirement: 搜索和筛选

系统应允许按值文本搜索规则，并按类型或分类筛选。

#### Scenario: 按值搜索

- **WHEN** 用户搜索 "face" 且存在 "facebook.com"、"faceit.com" 和 "youtube.com" 规则
- **THEN** 只显示 "facebook.com" 和 "faceit.com"

#### Scenario: 按分类筛选

- **WHEN** 用户按分类"社交"筛选，且存在社交和视频规则
- **THEN** 只显示社交分类的规则

#### Scenario: 组合搜索和筛选

- **WHEN** 用户按类型"域名"筛选并搜索 "book"
- **THEN** 只显示域名类型且值包含 "book" 的规则
