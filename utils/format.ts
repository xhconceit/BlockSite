export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN');
}

export function formatCountdown(remainingSeconds: number): string {
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  return `${m} 分 ${String(s).padStart(2, '0')} 秒`;
}

export function getDayLabel(day: number): string {
  const labels = ['日', '一', '二', '三', '四', '五', '六'];
  return `周${labels[day]}`;
}
