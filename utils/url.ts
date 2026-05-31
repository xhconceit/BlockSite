export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function extractPath(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + u.pathname;
  } catch {
    return url;
  }
}

export function matchesPattern(url: string, item: import('../types').BlockedItem): boolean {
  if (!item.enabled) return false;

  switch (item.type) {
    case 'domain':
      return extractDomain(url) === item.value.toLowerCase();

    case 'path':
      return extractPath(url).toLowerCase().startsWith(item.value.toLowerCase());

    case 'keyword':
      return url.toLowerCase().includes(item.value.toLowerCase());

    case 'regex':
      try {
        return new RegExp(item.value, 'i').test(url);
      } catch {
        return false;
      }

    default:
      return false;
  }
}
