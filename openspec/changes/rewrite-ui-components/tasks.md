## 实现任务

### 1. 重写 Select 组件 ✅

**文件**: `components/ui/Select.tsx`

- [x] 去掉原生 `<select>` 和 `<option>`
- [x] 实现 `useState` + `useRef` 管理展开/关闭状态
- [x] 自定义下拉面板（`<ul>` + `<li>`）
- [x] 键盘导航：ArrowDown/ArrowUp/Enter/Escape
- [x] 外部 `mousedown` 监听关闭
- [x] 选中项显示 checkmark 图标
- [x] Chevron 图标旋转动画
- [x] 高亮项滚动到可见区域
- [x] API 向后兼容（`onChange({ target: { value } })`）

### 2. 新建 Checkbox 组件 ✅

**文件**: `components/ui/Checkbox.tsx`

- [x] 自定义选中框，使用 `<button role="checkbox">`
- [x] 支持 `checked: boolean | "indeterminate"`
- [x] 选中态：bg-lime-300 + check SVG
- [x] 半选态：bg-lime-300 + dash SVG
- [x] 未选态：空框 + border-zinc-600
- [x] `aria-checked` 正确设置
- [x] disabled 状态支持

### 3. 新建 Radio 组件 ✅

**文件**: `components/ui/Radio.tsx`

- [x] `RadioGroup` 容器用 Context 管理选中值
- [x] `Radio` 项使用 `<button role="radio">`
- [x] 选中态：border-lime-300 + 内圈 bg-lime-300
- [x] 未选态：border-zinc-600
- [x] `aria-checked` 正确设置
- [x] disabled 状态支持
- [x] 可选 label（children）

### 4. 新建 Textarea 组件 ✅

**文件**: `components/ui/Textarea.tsx`

- [x] `forwardRef` 暴露底层 `<textarea>` ref
- [x] 与 Input 一致样式 token
- [x] 默认 `resize-none`
- [x] 继承 `TextareaHTMLAttributes`

### 5. 替换原生元素引用 ✅

**文件**: `entrypoints/options/App.tsx`

- [x] 3 处 `<input type="checkbox">` → `<Checkbox>`
- [x] 1 处 `<textarea>` → `<Textarea>`
- [x] `allSel` 逻辑适配 Checkbox 三态
- [x] 导入 Checkbox 和 Textarea 组件

### 6. 验证 ✅

- [x] `pnpm typecheck` 通过
- [x] `pnpm lint` 仅 1 个已有 warning
- [x] `pnpm test` 48 tests pass
- [x] `pnpm build` 成功
