## 需求

### Requirement: Select 自定义下拉

Select 组件应使用自定义下拉面板替代原生 `<select>`，支持键盘导航和外部点击关闭。

#### Scenario: 点击展开下拉

- **WHEN** 用户点击 Select 触发器
- **THEN** 下拉面板展开，显示所有选项，当前选中项旁显示 checkmark

#### Scenario: 选择选项

- **WHEN** 用户点击某个选项
- **THEN** 该选项被选中，`onChange` 触发，下拉面板关闭

#### Scenario: 键盘导航

- **WHEN** 下拉面板展开且用户按下 ArrowDown
- **THEN** 高亮移动到下一个选项
- **WHEN** 用户按下 Enter
- **THEN** 高亮选项被选中，下拉关闭

#### Scenario: 外部点击关闭

- **WHEN** 下拉面板展开且用户点击组件外部区域
- **THEN** 下拉面板关闭，选项不变

#### Scenario: Escape 关闭

- **WHEN** 下拉面板展开且用户按下 Escape
- **THEN** 下拉面板关闭，选项不变

### Requirement: Checkbox 三态

Checkbox 组件应支持未选、选中、半选三种状态，不使用原生 `<input type="checkbox">`。

#### Scenario: 切换选中

- **WHEN** 用户点击未选的 Checkbox
- **THEN** `onCheckedChange(true)` 触发，组件显示选中态

#### Scenario: 半选态

- **WHEN** `checked` 属性为 `"indeterminate"`
- **THEN** 组件显示半选态（dash 图标），`aria-checked="mixed"`

#### Scenario: 半选态点击

- **WHEN** 用户点击半选态的 Checkbox
- **THEN** `onCheckedChange(true)` 触发，切换到选中态

### Requirement: Radio 组

RadioGroup 应管理一组 Radio 的选中状态，互斥选择。

#### Scenario: 选择 Radio

- **WHEN** 用户在 RadioGroup 中点击某个未选的 Radio
- **THEN** 该 Radio 变为选中态，其他 Radio 取消选中，`RadioGroup.onChange(value)` 触发

#### Scenario: 已选 Radio 再次点击

- **WHEN** 用户点击已选中的 Radio
- **THEN** 无变化，保持选中

### Requirement: Textarea 样式统一

Textarea 组件应与 Input 组件视觉一致，使用相同的 border、background、placeholder、focus ring 样式。

#### Scenario: 聚焦 Textarea

- **WHEN** 用户点击或 Tab 到 Textarea
- **THEN** 显示 ring-2 ring-lime-300 聚焦环，border 透明

#### Scenario: 输入文本

- **WHEN** 用户输入多行文本
- **THEN** 内容正确显示，resize 禁用
