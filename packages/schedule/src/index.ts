import type { ScheduleConfig, SchedulePeriod } from "@blocksite/core";
import { schedule as scheduleRepo } from "@blocksite/storage";
import { emitter } from "@blocksite/event-bus";

export async function getConfig(): Promise<ScheduleConfig> {
  return scheduleRepo.get();
}

export async function saveConfig(config: ScheduleConfig): Promise<void> {
  await scheduleRepo.put(config);
  emitter.emit("schedule:changed", { config });
}

export function isActive(config: ScheduleConfig, timestamp: number): boolean {
  if (!config.enabled) return false;

  const date = new Date(timestamp);
  if (isExcluded(config, date)) return false;

  if (config.pomodoro.enabled) {
    return isPomodoroActive(config, timestamp);
  }

  return isPeriodActive(config.periods, date);
}

function isPeriodActive(periods: SchedulePeriod[], date: Date): boolean {
  const dayOfWeek = date.getDay() || 7; // Convert Sunday 0 → 7
  const minutes = date.getHours() * 60 + date.getMinutes();

  for (const period of periods) {
    if (!period.days.includes(dayOfWeek)) continue;
    const start = period.startHour * 60 + period.startMinute;
    const end = period.endHour * 60 + period.endMinute;
    if (minutes >= start && minutes < end) return true;
  }
  return false;
}

function isExcluded(config: ScheduleConfig, date: Date): boolean {
  const dateStr = formatDate(date);
  for (const exclusion of config.exclusions) {
    if (exclusion.type === "once" && exclusion.date === dateStr) return true;
    if (exclusion.type === "recurring") {
      const [, mm, dd] = exclusion.date.split("-") as [string, string, string];
      const exMonth = parseInt(mm ?? "0", 10);
      const exDay = parseInt(dd ?? "0", 10);
      if (date.getMonth() + 1 === exMonth && date.getDate() === exDay) return true;
    }
  }
  return false;
}

function isPomodoroActive(config: ScheduleConfig, timestamp: number): boolean {
  const { pomodoro } = config;
  const cycleLength = pomodoro.workMinutes + pomodoro.breakMinutes;
  const totalCycleMs = cycleLength * 60 * 1000;
  const totalDuration = pomodoro.cycles * totalCycleMs;

  const now = new Date(timestamp);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsed = timestamp - todayStart.getTime();

  if (elapsed > totalDuration) return false;
  if (elapsed < 0) return false;

  const cyclePosition = elapsed % totalCycleMs;
  const minutesIn = cyclePosition / (60 * 1000);
  return minutesIn < pomodoro.workMinutes;
}

export function detectOverlap(periods: SchedulePeriod[], newPeriod: SchedulePeriod): boolean {
  const newStart = newPeriod.startHour * 60 + newPeriod.startMinute;
  const newEnd = newPeriod.endHour * 60 + newPeriod.endMinute;

  for (const existing of periods) {
    if (!hasCommonDay(existing.days, newPeriod.days)) continue;
    const exStart = existing.startHour * 60 + existing.startMinute;
    const exEnd = existing.endHour * 60 + existing.endMinute;
    if (newStart < exEnd && newEnd > exStart) return true;
  }
  return false;
}

function hasCommonDay(days1: number[], days2: number[]): boolean {
  return days1.some((d) => days2.includes(d));
}

export function nextChange(
  config: ScheduleConfig,
  timestamp: number,
): { type: "start" | "end"; time: number } | null {
  if (!config.enabled) return null;
  const date = new Date(timestamp);

  for (const period of config.periods) {
    const dayOfWeek = date.getDay() || 7;
    if (!period.days.includes(dayOfWeek)) continue;
    const nowMinutes = date.getHours() * 60 + date.getMinutes();
    const startMinutes = period.startHour * 60 + period.startMinute;
    const endMinutes = period.endHour * 60 + period.endMinute;

    if (nowMinutes < startMinutes) {
      const startTime = new Date(date);
      startTime.setHours(period.startHour, period.startMinute, 0, 0);
      return { type: "start", time: startTime.getTime() };
    }
    if (nowMinutes < endMinutes) {
      const endTime = new Date(date);
      endTime.setHours(period.endHour, period.endMinute, 0, 0);
      return { type: "end", time: endTime.getTime() };
    }
  }
  return null;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
