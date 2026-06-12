# Proposal: 重写基础 UI 组件

## 动机

当前项目的基础 UI 组件存在以下问题：

1. **Select** 使用原生 `<select>` + `<option>`，下拉菜单无法自定义样式，与暗色主题不协调
2. **无 Checkbox 组件**，options 页面 3 处直接使用 `<input type="checkbox">`，样式不统一
3. **无 Radio 组件**，未来功能需要
4. **无 Textarea 组件**，导入区直接使用 `<textarea>`，缺少统一封装

## 目标

重写/新建 4 个基础 UI 组件，全部去掉原生 HTML 元素实现，统一使用暗色主题设计语言。

## 范围

| 组件     | 操作 | 说明                                   |
| -------- | ---- | -------------------------------------- |
| Select   | 重写 | 自定义下拉面板，键盘导航，外部点击关闭 |
| Checkbox | 新建 | 支持 checked / indeterminate 两态      |
| Radio    | 新建 | RadioGroup + Radio 组合                |
| Textarea | 新建 | 与 Input 视觉一致                      |

## 非目标

- 不修改 Input、Button、Toggle、Modal、Badge、Tabs、Toast 组件
- 不修改 `<input type="color">`（原生取色器无可替代）
- 不添加新的依赖包
