import type { ScheduleConfig } from '../types';

const ALARM_START = 'blocksite_schedule_start';
const ALARM_END = 'blocksite_schedule_end';

export async function setupAlarms(schedule: ScheduleConfig): Promise<void> {
  await chrome.alarms.clear(ALARM_START);
  await chrome.alarms.clear(ALARM_END);

  if (!schedule.enabled) return;

  const now = new Date();
  const today = now.getDay();

  if (!schedule.days.includes(today)) return;

  const startDate = new Date(now);
  startDate.setHours(schedule.startHour, schedule.startMinute, 0, 0);

  const endDate = new Date(now);
  endDate.setHours(schedule.endHour, schedule.endMinute, 0, 0);

  if (now < startDate) {
    chrome.alarms.create(ALARM_START, {
      when: startDate.getTime(),
      periodInMinutes: 24 * 60,
    });
  }

  if (now < endDate) {
    chrome.alarms.create(ALARM_END, {
      when: endDate.getTime(),
      periodInMinutes: 24 * 60,
    });
  }
}

export async function clearAlarms(): Promise<void> {
  await chrome.alarms.clear(ALARM_START);
  await chrome.alarms.clear(ALARM_END);
}

export async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<'start' | 'end' | null> {
  if (alarm.name === ALARM_START) return 'start';
  if (alarm.name === ALARM_END) return 'end';
  return null;
}
