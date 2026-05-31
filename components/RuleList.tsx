import { useState } from 'react';
import type { BlockedItem, BlockType, Category } from '../types';
import RuleItem from './RuleItem';
import Modal from './ui/Modal';
import RuleForm from './RuleForm';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { showToast } from './ui/Toast';

interface RuleListProps {
  items: BlockedItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterType: BlockType | 'all';
  onFilterTypeChange: (t: BlockType | 'all') => void;
  filterCategory: Category | 'all';
  onFilterCategoryChange: (c: Category | 'all') => void;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<BlockedItem>) => void;
  onDelete: (id: string) => void;
  onAdd: (type: BlockType, value: string, category: Category, customMessage: string) => void;
}

export default function RuleList({
  items,
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterCategory,
  onFilterCategoryChange,
  onToggle,
  onUpdate,
  onDelete,
  onAdd,
}: RuleListProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<BlockedItem | null>(null);

  const handleAdd = (data: { type: BlockType; value: string; category: Category; customMessage: string }) => {
    onAdd(data.type, data.value, data.category, data.customMessage);
    setShowAddModal(false);
    showToast('规则已添加', 'success');
  };

  const handleEdit = (data: { type: BlockType; value: string; category: Category; customMessage: string }) => {
    if (!editingItem) return;
    onUpdate(editingItem.id, { type: data.type, value: data.value, category: data.category, customMessage: data.customMessage });
    setEditingItem(null);
    showToast('规则已更新', 'success');
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    showToast('规则已删除', 'info');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="搜索规则..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Select
          options={[
            { value: 'all', label: '全部类型' },
            { value: 'domain', label: '域名' },
            { value: 'path', label: '路径' },
            { value: 'keyword', label: '关键词' },
            { value: 'regex', label: '正则' },
          ]}
          value={filterType}
          onChange={(v) => onFilterTypeChange(v as BlockType | 'all')}
          className="w-28"
        />
        <Select
          options={[
            { value: 'all', label: '全部分类' },
            { value: 'social', label: '社交' },
            { value: 'video', label: '视频' },
            { value: 'game', label: '游戏' },
            { value: 'news', label: '新闻' },
            { value: 'adult', label: '成人' },
            { value: 'custom', label: '自定义' },
          ]}
          value={filterCategory}
          onChange={(v) => onFilterCategoryChange(v as Category | 'all')}
          className="w-28"
        />
        <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
          + 添加规则
        </Button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lg mb-2">还没有拦截规则</p>
          <p className="text-sm">点击「添加规则」开始设置，或使用分类预设一键添加</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <RuleItem
              key={item.id}
              item={item}
              onToggle={onToggle}
              onEdit={(item) => setEditingItem(item)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="添加拦截规则">
        <RuleForm onSave={handleAdd} onCancel={() => setShowAddModal(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="编辑拦截规则">
        {editingItem && (
          <RuleForm item={editingItem} onSave={handleEdit} onCancel={() => setEditingItem(null)} />
        )}
      </Modal>
    </div>
  );
}
