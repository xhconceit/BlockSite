import { useState } from 'react';
import { exportConfig, importConfig } from '../lib/storage';
import Button from './ui/Button';
import { showToast } from './ui/Toast';

interface ImportExportProps {
  onImport: () => void;
}

export default function ImportExport({ onImport }: ImportExportProps) {
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      const json = await exportConfig();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blocksite-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('配置已导出', 'success');
    } catch {
      showToast('导出失败', 'error');
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        await importConfig(text);
        showToast('配置已导入', 'success');
        onImport();
      } catch {
        showToast('导入失败：文件格式不正确', 'error');
      }
      setImporting(false);
    };
    input.click();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Export */}
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <h3 className="font-medium text-[var(--color-text)] mb-1">导出配置</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          将所有规则、定时设置等信息导出为 JSON 文件，方便备份和迁移
        </p>
        <Button variant="outline" onClick={handleExport}>
          导出 JSON 文件
        </Button>
      </div>

      {/* Import */}
      <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <h3 className="font-medium text-[var(--color-text)] mb-1">导入配置</h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          从 JSON 文件导入配置，将覆盖当前设置
        </p>
        <Button variant="outline" onClick={handleImport} disabled={importing}>
          {importing ? '导入中...' : '选择 JSON 文件导入'}
        </Button>
      </div>
    </div>
  );
}
