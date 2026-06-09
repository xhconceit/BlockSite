## 新增需求

### Requirement: 拦截统计记录

系统应记录每次拦截事件，包含：时间戳、规则 ID、分类和拦截 URL。统计数据应存入 IndexedDB 并在会话间持久化。

#### Scenario: 拦截事件被记录

- **WHEN** 规则拦截了一次网站导航
- **THEN** 创建一条包含当前时间戳、规则 ID、分类和 URL 的新统计记录

#### Scenario: 统计跨会话持久化

- **WHEN** 浏览器重启
- **THEN** 之前记录的所有统计数据仍可查询

### Requirement: 按分类统计

系统应为给定时间范围按分类汇总拦截次数。汇总应包含总次数和占总拦截的百分比。

#### Scenario: 今日分类分布

- **WHEN** 用户查看今日统计，社交 30 次、视频 20 次、游戏 10 次
- **THEN** 系统显示社交（50%）、视频（33%）、游戏（17%）

### Requirement: 按时段统计

系统应为给定日期范围按小时汇总拦截次数，支持热力图或柱状图展示。

#### Scenario: 小时分布

- **WHEN** 用户查看今日统计
- **THEN** 系统展示每天各小时（0-23）的拦截次数

### Requirement: 按规则统计

系统应按触发总次数排列拦截规则，展示哪些规则触发最频繁。

#### Scenario: 拦截最多规则排名

- **WHEN** 用户查看过去一周规则排名
- **THEN** 规则按总拦截次数排序，触发最多的规则排最前

### Requirement: 趋势对比

系统应支持两个时间段的统计对比（如本周 vs 上周），显示百分比变化。

#### Scenario: 周环比

- **WHEN** 用户查看对比仪表盘
- **THEN** 系统显示本周拦截次数、上周拦截次数及变化百分比

### Requirement: Dashboard 页面

系统应提供独立 Dashboard 页面，可从选项页或扩展操作访问。Dashboard 应以 Recharts 渲染图表：分类分布（饼图）、按时段热力图（柱状图）、规则排名（水平柱状图）和趋势对比（折线图）。

#### Scenario: Dashboard 渲染所有图表

- **WHEN** 用户打开 Dashboard
- **THEN** 四种图表类型均以当前数据可见

#### Scenario: Dashboard 空状态

- **WHEN** 用户打开 Dashboard 但尚未记录拦截数据
- **THEN** 每个图表区域显示空状态提示，而非空白图表

### Requirement: Dashboard 响应式布局

Dashboard 应适配窄视口。图表在 1024px 以下宽度时垂直堆叠，宽屏时并排显示。

#### Scenario: 窄视口

- **WHEN** Dashboard 视口宽度小于 1024px
- **THEN** 图表以单列显示
