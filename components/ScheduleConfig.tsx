import type { ScheduleConfig } from '../types';
import Toggle from './ui/Toggle';
import Select from './ui/Select';
import { getDayLabel } from '../utils/format';
import { showToast } from './ui/Toast';

interface ScheduleConfigProps {
  schedule: ScheduleConfig;
  onToggleEnabled: () => void;
  onUpdate: (partial: Partial<ScheduleConfig>) => void;
  onToggleDay: (day: number) => void;
  onSave: () => void;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${String(i).padStart(2, '0')}:00`,
}));

const MINUTE_OPTIONS = [0, 15, 30, 45].map((m) => ({
  value: String(m),
  label: `${String(m).padStart(2, '0')}`,
}));

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export default function ScheduleConfigPanel({ schedule, onToggleEnabled, onUpdate, onToggleDay, onSave }: ScheduleConfigProps) {
  const handleSave = () => {
    onSave();
    showToast('定时设置已保存', 'success');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div>
          <h3 className="font-medium text-[var(--color-text)]">启用定时拦截</h3>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">在指定时间段自动开启拦截</p>
        </div>
        <Toggle checked={schedule.enabled} onChange={() => onToggleEnabled()} />
      </div>

      {schedule.enabled && (
        <>
          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">开始时间</span>
              <div className="flex items-center gap-1">
                <Select
                  options={HOUR_OPTIONS}
                  value={String(schedule.startHour)}
                  onChange={(v) => onUpdate({ startHour: Number(v) })}
                  className="w-20"
                />
                <span className="text-[var(--color-text)]">:</span>
                <Select
                  options={MINUTE_OPTIONS}
                  value={String(schedule.startMinute)}
                  onChange={(v) => onUpdate({ startMinute: Number(v) })}
                  className="w-20"
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">结束时间</span>
              <div className="flex items-center gap-1">
                <Select
                  options={HOUR_OPTIONS}
                  value={String(schedule.endHour)}
                  onChange={(v) => onUpdate({ endHour: Number(v) })}
                  className="w-20"
                />
                <span className="text-[var(--color-text)]">:</span>
                <Select
                  options={MINUTE_OPTIONS}
                  value={String(schedule.endMinute)}
                  onChange={(v) => onUpdate({ endMinute: Number(v) })}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          {/* Days */}
          <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <span className="text-sm text-[var(--color-text-muted)] mb-3 block">生效日期</span>
            <div className="flex gap-2">
              {DAYS.map((day) => {
                const active = schedule.days.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => onToggleDay(day)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                    }`}
                  >
                    {getDayLabel(day)}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white transition-colors cursor-pointer"
          >
            保存定时设置
          </button>
        </>
      )}
    </div>
  );
}
