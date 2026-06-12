# 设计文档: UI 组件重写

## 设计原则

- **零原生表单元素**：Select、Checkbox、Radio 不使用 `<select>`、`<input type="checkbox">`、`<input type="radio">`
- **统一视觉语言**：所有组件共享 border/bg/focus ring 样式 token
- **API 兼容**：Select 的 `onChange` 保持 `{ target: { value } }` 接口，现有调用方无需修改
- **键盘可访问**：支持 Tab、Arrow、Enter、Escape 导航

## 样式 Token

```
border: border-zinc-700
background: bg-zinc-800
text: text-zinc-100
placeholder: text-zinc-500
focus ring: ring-2 ring-lime-300
disabled: opacity-50 cursor-not-allowed
```

## Select 组件

### 结构

```
<div ref={containerRef}>         ← 容器，用于外部点击检测
  <button>                       ← 触发器
    <span>{selectedLabel}</span>
    <ChevronDownIcon />           ← 旋转动画指示展开状态
  </button>
  {open && (
    <ul ref={listRef}>           ← 下拉面板，absolute + z-50
      <li>                       ← 选项行
        <CheckIcon />            ← 仅当前选中项显示
        {label}
      </li>
    </ul>
  )}
</div>
```

### 交互

| 操作       | 行为                 |
| ---------- | -------------------- |
| 点击触发器 | 切换展开/收起        |
| 点击选项   | 选中该选项，关闭下拉 |
| 点击外部   | 关闭下拉             |
| Escape     | 关闭下拉             |
| ArrowDown  | 下移高亮             |
| ArrowUp    | 上移高亮             |
| Enter      | 选择高亮项           |

### API

```ts
interface SelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
  disabled?: boolean;
}
```

## Checkbox 组件

### 三态

| 状态 | `checked` 值      | 视觉                          |
| ---- | ----------------- | ----------------------------- |
| 未选 | `false`           | 空框 + border-zinc-600        |
| 选中 | `true`            | bg-lime-300 + 白色 check 图标 |
| 半选 | `"indeterminate"` | bg-lime-300 + 白色 dash 图标  |

### API

```ts
interface CheckboxProps {
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}
```

## Radio 组件

### 结构

```
RadioGroup (context provider)
  └── Radio (多个，通过 context 通信)
```

### API

```ts
interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

interface RadioProps {
  value: string;
  disabled?: boolean;
  children?: React.ReactNode;  // label
}
```

### 视觉

| 状态 | 外圈            | 内圈                |
| ---- | --------------- | ------------------- |
| 未选 | border-zinc-600 | 无                  |
| 选中 | border-lime-300 | bg-lime-300 (8×8px) |

## Textarea 组件

与 Input 组件完全相同的样式，仅增加 `resize-none` 和 `h-32` 默认高度。通过 `forwardRef` 暴露底层 ref。

### API

```ts
// 继承 TextareaHTMLAttributes，无需自定义 props
const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(...)
```
