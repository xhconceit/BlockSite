## 新增需求

### Requirement: 类型化事件定义

所有事件应在 `@blocksite/core` 中作为 TypeScript 类型 map 定义。每个事件应有唯一名称和类型化 payload。该 map 应是扩展内所有消息形状的唯一真实来源。

#### Scenario: 事件类型安全

- **WHEN** 包以错误 payload 类型发出事件
- **THEN** TypeScript 报告编译错误

### Requirement: 同上下文发布订阅

事件总线应为同一 JavaScript 上下文内的发布/订阅通信提供类型化的 `EventEmitter`。订阅者应按发出顺序接收事件。

#### Scenario: 订阅并接收事件

- **WHEN** 组件订阅 `rule:updated` 且规则被更新
- **THEN** 订阅者收到包含更新规则数据的事件

#### Scenario: 取消订阅停止接收

- **WHEN** 组件取消订阅 `rule:updated`
- **THEN** 后续规则更新不触发原订阅者

#### Scenario: 多个订阅者

- **WHEN** 两个组件订阅 `schedule:changed`
- **THEN** 调度变更时两者都收到事件

### Requirement: 跨上下文消息

事件总线应封装 `chrome.runtime.sendMessage` 用于不同扩展上下文（popup、options 页面、background service worker）之间的通信。封装应是类型安全的，使用相同的事件类型 map。

#### Scenario: Popup 向后台请求配置

- **WHEN** popup 调用 `eventBus.request('getConfig')`
- **THEN** background service worker 收到请求并以当前配置响应

#### Scenario: 后台通知 popup 状态变更

- **WHEN** background service worker 因调度变更了拦截状态
- **THEN** 任意打开的 popup 收到 `state:changed` 事件

### Requirement: 请求/响应模式

事件总线应支持异步请求/响应模式，用于需要返回值的查询。请求者应收到一个类型化的 Promise，以响应数据 resolve。

#### Scenario: 异步请求带响应

- **WHEN** options 页面通过 `eventBus.request('getUnlockState', { category: 'game' })` 请求解锁状态
- **THEN** 后台以解锁状态响应，Promise resolve

#### Scenario: 请求超时

- **WHEN** 发出请求但无响应者在 5 秒内处理
- **THEN** Promise 以超时错误 reject

### Requirement: 错误隔离

一个事件处理器中的错误不应阻止其他处理器接收事件。错误应被捕获并记录，不向上传播。

#### Scenario: 处理器抛出错误

- **WHEN** `rule:updated` 的一个订阅者抛出错误
- **THEN** 其他订阅者仍然收到事件，错误被记录到控制台
