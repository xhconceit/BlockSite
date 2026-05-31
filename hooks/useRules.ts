import { useState, useCallback } from 'react';
import type { BlockedItem, BlockType, Category } from '../types';
import { generateId } from '../utils/id';

export function useRules(
  items: BlockedItem[],
  onItemsChange: (items: BlockedItem[]) => void,
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<BlockType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');

  const filteredItems = items.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (searchQuery && !item.value.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const addItem = useCallback(
    (type: BlockType, value: string, category: Category = 'custom', customMessage: string = '') => {
      const newItem: BlockedItem = {
        id: generateId(),
        type,
        value: value.trim().toLowerCase(),
        enabled: true,
        category,
        customMessage,
      };
      onItemsChange([...items, newItem]);
    },
    [items, onItemsChange],
  );

  const updateItem = useCallback(
    (id: string, updates: Partial<BlockedItem>) => {
      onItemsChange(items.map((item) => (item.id === id ? { ...item, ...updates } : item)));
    },
    [items, onItemsChange],
  );

  const removeItem = useCallback(
    (id: string) => {
      onItemsChange(items.filter((item) => item.id !== id));
    },
    [items, onItemsChange],
  );

  const toggleItem = useCallback(
    (id: string) => {
      onItemsChange(
        items.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
      );
    },
    [items, onItemsChange],
  );

  const removeItems = useCallback(
    (ids: string[]) => {
      onItemsChange(items.filter((item) => !ids.includes(item.id)));
    },
    [items, onItemsChange],
  );

  return {
    items,
    filteredItems,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterCategory,
    setFilterCategory,
    addItem,
    updateItem,
    removeItem,
    toggleItem,
    removeItems,
  };
}
