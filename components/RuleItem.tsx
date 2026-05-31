import type { BlockedItem } from '../types';
import { getThemeColor } from '../lib/quotes';
import Toggle from './ui/Toggle';
import Badge from './ui/Badge';

interface RuleItemProps {
  item: BlockedItem;
  onToggle: (id: string) => void;
  onEdit: (item: BlockedItem) => void;
  onDelete: (id: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  domain: '域名',
  path: '路径',
  keyword: '关键词',
  regex: '正则',
};

const CATEGORY_LABELS: Record<string, string> = {
  social: '社交',
  video: '视频',
  game: '游戏',
  news: '新闻',
  adult: '成人',
  custom: '自定义',
};

export default function RuleItem({ item, onToggle, onEdit, onDelete }: RuleItemProps) {
  const color = getThemeColor(item.category);

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
      item.enabled ? 'border-[var(--color-border)] bg-[var(--color-surface)]' : 'border-slate-700/50 bg-slate-800/30'
    }`}>
      <Toggle checked={item.enabled} onChange={() => onToggle(item.id)} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge color={color}>{TYPE_LABELS[item.type]}</Badge>
          <Badge color={color}>{CATEGORY_LABELS[item.category]}</Badge>
          <span className={`text-sm font-mono truncate ${item.enabled ? 'text-[var(--color-text)]' : 'text-slate-500'}`}>
            {item.value}
          </span>
        </div>
        {item.customMessage && (
          <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{item.customMessage}</p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(item)}
          className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
          title="编辑"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-red-500/10 transition-colors cursor-pointer"
          title="删除"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
