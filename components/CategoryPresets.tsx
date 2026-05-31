import type { BlockType, Category } from '../types';
import { getThemeColor } from '../lib/quotes';
import Button from './ui/Button';
import { showToast } from './ui/Toast';

interface Preset {
  label: string;
  category: Category;
  items: { type: BlockType; value: string }[];
}

const PRESETS: Preset[] = [
  {
    label: '社交媒体',
    category: 'social',
    items: [
      { type: 'domain', value: 'facebook.com' },
      { type: 'domain', value: 'twitter.com' },
      { type: 'domain', value: 'x.com' },
      { type: 'domain', value: 'instagram.com' },
      { type: 'domain', value: 'tiktok.com' },
      { type: 'domain', value: 'weibo.com' },
      { type: 'domain', value: 'douban.com' },
      { type: 'path', value: 'zhihu.com' },
      { type: 'path', value: 'tieba.baidu.com' },
    ],
  },
  {
    label: '视频网站',
    category: 'video',
    items: [
      { type: 'domain', value: 'youtube.com' },
      { type: 'domain', value: 'bilibili.com' },
      { type: 'domain', value: 'netflix.com' },
      { type: 'domain', value: 'iqiyi.com' },
      { type: 'domain', value: 'youku.com' },
      { type: 'domain', value: 'v.qq.com' },
      { type: 'domain', value: 'douyin.com' },
      { type: 'domain', value: 'kuaishou.com' },
    ],
  },
  {
    label: '游戏网站',
    category: 'game',
    items: [
      { type: 'domain', value: 'steampowered.com' },
      { type: 'domain', value: 'epicgames.com' },
      { type: 'domain', value: 'twitch.tv' },
      { type: 'domain', value: 'nexusmods.com' },
      { type: 'keyword', value: 'game' },
    ],
  },
  {
    label: '新闻资讯',
    category: 'news',
    items: [
      { type: 'domain', value: 'reddit.com' },
      { type: 'domain', value: 'news.ycombinator.com' },
      { type: 'domain', value: 'toutiao.com' },
      { type: 'domain', value: '36kr.com' },
      { type: 'domain', value: 'thepaper.cn' },
    ],
  },
];

interface CategoryPresetsProps {
  onAddItems: (items: { type: BlockType; value: string; category: Category; customMessage: string }[]) => void;
}

export default function CategoryPresets({ onAddItems }: CategoryPresetsProps) {
  const handleAddPreset = (preset: Preset) => {
    const items = preset.items.map((item) => ({
      ...item,
      category: preset.category,
      customMessage: '',
    }));
    onAddItems(items);
    showToast(`已添加 ${preset.label} 预设规则`, 'success');
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {PRESETS.map((preset) => {
        const color = getThemeColor(preset.category);
        return (
          <div
            key={preset.label}
            className="p-4 rounded-lg border transition-colors"
            style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-[var(--color-text)]">{preset.label}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                {preset.items.length} 个规则
              </span>
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mb-3 line-clamp-2">
              {preset.items.map((i) => i.value).join('、')}
            </div>
            <Button variant="outline" size="sm" onClick={() => handleAddPreset(preset)} className="w-full">
              一键添加
            </Button>
          </div>
        );
      })}
    </div>
  );
}
