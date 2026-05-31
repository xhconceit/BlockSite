import { useCallback } from 'react';
import type { BlockedItem } from '../types';
import { extractDomain } from '../utils/url';

export function useBlockedItems(items: BlockedItem[]) {
  const isUrlBlocked = useCallback(
    (url: string): BlockedItem | null => {
      const domain = extractDomain(url);
      for (const item of items) {
        if (!item.enabled) continue;
        switch (item.type) {
          case 'domain':
            if (domain === item.value.toLowerCase()) return item;
            break;
          case 'keyword':
            if (url.toLowerCase().includes(item.value.toLowerCase())) return item;
            break;
          case 'path': {
            const fullPath = domain + new URL(url).pathname;
            if (fullPath.toLowerCase().startsWith(item.value.toLowerCase())) return item;
            break;
          }
          case 'regex':
            try {
              if (new RegExp(item.value, 'i').test(url)) return item;
            } catch {
              // invalid regex, skip
            }
            break;
        }
      }
      return null;
    },
    [items],
  );

  const isDomainBlocked = useCallback(
    (domain: string): BlockedItem | null => {
      return items.find(
        (item) => item.enabled && item.type === 'domain' && item.value.toLowerCase() === domain.toLowerCase(),
      ) || null;
    },
    [items],
  );

  return { isUrlBlocked, isDomainBlocked };
}
