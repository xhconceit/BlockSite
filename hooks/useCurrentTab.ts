import { useState, useEffect } from 'react';

export function useCurrentTab() {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      setTab(tabs[0] || null);
    });
  }, []);

  const url = tab?.url || '';
  const domain = url ? new URL(url).hostname.replace(/^www\./, '') : '';
  const title = tab?.title || '';

  return { tab, url, domain, title };
}
