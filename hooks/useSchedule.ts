import { useState, useCallback } from 'react';
import type { ScheduleConfig } from '../types';

export function useSchedule(
  initial: ScheduleConfig,
  onChange: (schedule: ScheduleConfig) => void,
) {
  const [schedule, setSchedule] = useState<ScheduleConfig>(initial);

  const update = useCallback(
    (partial: Partial<ScheduleConfig>) => {
      const updated = { ...schedule, ...partial };
      setSchedule(updated);
      onChange(updated);
    },
    [schedule, onChange],
  );

  const toggleDay = useCallback(
    (day: number) => {
      const days = schedule.days.includes(day)
        ? schedule.days.filter((d) => d !== day)
        : [...schedule.days, day].sort();
      update({ days });
    },
    [schedule, update],
  );

  const toggleEnabled = useCallback(() => {
    update({ enabled: !schedule.enabled });
  }, [schedule, update]);

  return { schedule, setSchedule, update, toggleDay, toggleEnabled };
}
