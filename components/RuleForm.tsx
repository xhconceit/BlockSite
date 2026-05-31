import { useState } from 'react';
import type { BlockedItem, BlockType, Category } from '../types';
import { getThemeColor } from '../lib/quotes';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';

interface RuleFormProps {
  item?: BlockedItem;
  onSave: (data: { type: BlockType; value: string; category: Category; customMessage: string }) => void;
  onCancel: () => void;
}

const TYPE_OPTIONS = [
  { value: 'domain', label: '域名 (如: facebook.com)' },
  { value: 'path', label: '路径 (如: youtube.com/shorts)' },
  { value: 'keyword', label: '关键词 (如: game)' },
  { value: 'regex', label: '正则 (如: .*\\.torrent.*)' },
];

const CATEGORY_OPTIONS = [
  { value: 'social', label: '社交' },
  { value: 'video', label: '视频' },
  { value: 'game', label: '游戏' },
  { value: 'news', label: '新闻' },
  { value: 'adult', label: '成人' },
  { value: 'custom', label: '自定义' },
];

export default function RuleForm({ item, onSave, onCancel }: RuleFormProps) {
  const [type, setType] = useState<BlockType>(item?.type || 'domain');
  const [value, setValue] = useState(item?.value || '');
  const [category, setCategory] = useState<Category>(item?.category || 'custom');
  const [customMessage, setCustomMessage] = useState(item?.customMessage || '');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!value.trim()) {
      setError('请输入拦截值');
      return;
    }
    if (type === 'regex') {
      try {
        new RegExp(value);
      } catch {
        setError('正则表达式格式错误');
        return;
      }
    }
    onSave({ type, value: value.trim(), category, customMessage: customMessage.trim() });
  };

  const themeColor = getThemeColor(category);

  return (
    <div className="flex flex-col gap-4">
      <Select label="拦截类型" options={TYPE_OPTIONS} value={type} onChange={(v) => setType(v as BlockType)} />
      <Input
        label="拦截值"
        placeholder={TYPE_OPTIONS.find((o) => o.value === type)?.label.split(' ')[0]}
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(''); }}
        error={error}
        autoFocus
      />
      <Select label="分类" options={CATEGORY_OPTIONS} value={category} onChange={(v) => setCategory(v as Category)} />
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeColor }} />
        <span className="text-xs text-[var(--color-text-muted)]">拦截页面主题色</span>
      </div>
      <Input
        label="自定义提示文字（可选）"
        placeholder="留空则使用默认励志语录"
        value={customMessage}
        onChange={(e) => setCustomMessage(e.target.value)}
      />
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="ghost" onClick={onCancel}>取消</Button>
        <Button variant="primary" onClick={handleSubmit}>{item ? '保存' : '添加'}</Button>
      </div>
    </div>
  );
}
