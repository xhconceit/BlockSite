## 新增需求

### Requirement: IndexedDB 存储层

系统应将所有持久化数据通过集中式 storage 包存入 IndexedDB。storage 包应是唯一直接访问 IndexedDB 的模块。它应暴露每个领域实体的类型化 CRUD 方法。

#### Scenario: 从 storage 读取规则

- **WHEN** 任意包调用 `storage.rules.getAll()`
- **THEN** storage 包查询 IndexedDB 的 `rules` store 并返回类型化的 Rule 对象

#### Scenario: 写规则到 storage

- **WHEN** rules 包调用 `storage.rules.put(rule)`
- **THEN** storage 包将规则写入 IndexedDB 的 `rules` store 并返回存储的对象

### Requirement: Dexie.js 封装

storage 包应使用 Dexie.js 作为 IndexedDB 抽象层。数据库版本管理和 schema 迁移应通过 Dexie 的版本化 API 管理。

#### Scenario: 数据库初始化

- **WHEN** 扩展首次安装
- **THEN** Dexie 以当前 schema 版本定义的所有 object store 创建 IndexedDB 数据库

#### Scenario: Schema 迁移

- **WHEN** 部署新的 schema 版本
- **THEN** Dexie 运行迁移函数升级已有数据

### Requirement: Object Store

IndexedDB 数据库应包含以下 object store：

- `rules`：以规则 ID 字符串为键，存储拦截规则对象
- `presets`：以分类字符串为键，存储预设网站列表
- `schedule`：以调度 ID 字符串为键，存储调度配置
- `auth`：以分类字符串为键，存储密码哈希
- `unlockState`：以分类字符串为键，存储当前解锁状态
- `stats`：以日期字符串为键，存储每日统计记录
- `settings`：以设置键字符串为键，存储全局键值对

#### Scenario: 每个 store 独立查询

- **WHEN** stats 包查询每日统计
- **THEN** 它仅从 `stats` store 读取，不加载其他 store 的数据

### Requirement: 选择性 JSON 导出

系统应允许用户将配置导出为 JSON 文件。用户应选择要包含的数据类别：规则、预设、调度、授权配置或统计。导出应在下载前显示 JSON 内容的预览。

#### Scenario: 仅导出规则

- **WHEN** 用户选择"规则"并点击导出
- **THEN** 下载的 JSON 文件仅包含规则数据

#### Scenario: 导出带预览

- **WHEN** 用户选择导出选项
- **THEN** 在下载前实时预览 JSON 内容

#### Scenario: 导出全部

- **WHEN** 用户选择所有类别并点击导出
- **THEN** 下载的 JSON 文件包含完整配置

### Requirement: JSON 导入带校验

系统应从 JSON 文件导入配置。导入应验证 JSON 结构，拒绝无效或格式错误的数据。用户应在应用更改前预览导入的数据。导入应根据用户选择合并或替换已有数据。

#### Scenario: 有效导入

- **WHEN** 用户导入包含 5 条规则的有效 JSON 文件
- **THEN** 5 条规则被添加到数据库

#### Scenario: 无效 JSON 被拒绝

- **WHEN** 用户导入不是合法 JSON 的文件
- **THEN** 系统显示验证错误，不修改任何数据

#### Scenario: 无效规则数据被拒绝

- **WHEN** 用户导入包含无效 type 字段规则的 JSON
- **THEN** 系统显示具体错误信息，指出无效字段

#### Scenario: 导入预览

- **WHEN** 用户选择要导入的 JSON 文件
- **THEN** 系统在应用更改前显示将要导入内容的摘要

### Requirement: IndexedDB 特性检测

系统应检测当前浏览器上下文中 IndexedDB 是否可用。如果 IndexedDB 不可用，系统应回退到 `chrome.storage.local` 并降低功能。

#### Scenario: IndexedDB 可用

- **WHEN** 扩展初始化且 IndexedDB 可用
- **THEN** 所有存储操作使用 IndexedDB 和完整功能

#### Scenario: IndexedDB 不可用

- **WHEN** 扩展初始化且 IndexedDB 不可用
- **THEN** 系统回退到 `chrome.storage.local` 并记录警告
