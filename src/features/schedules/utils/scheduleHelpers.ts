import {
  format,
  parseISO,
  isToday as isTodayFns,
  isSameDay,
  addDays,
  startOfWeek,
  eachDayOfInterval,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ScheduleEntry, ScheduleCalendarDay } from '../types/schedule.types';

/**
 * Format date for display
 */
export const formatScheduleDate = (
  date: string | Date,
  formatStr: string = 'dd MMMM yyyy'
): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: ru });
};

/**
 * Extract time from ISO datetime or time string without timezone conversion
 */
const extractTime = (timeStr: string): string => {
  // If it's an ISO datetime string like "2026-01-20T09:00:00Z"
  if (timeStr.includes('T')) {
    // Extract time part between T and Z (or end)
    const match = timeStr.match(/T(\d{2}:\d{2})/);
    if (match) {
      return match[1];
    }
  }
  // If it's already a time string like "09:00" or "09:00:00"
  const timeMatch = timeStr.match(/^(\d{2}:\d{2})/);
  if (timeMatch) {
    return timeMatch[1];
  }
  // Fallback: try parsing as ISO (will apply timezone)
  return format(parseISO(timeStr), 'HH:mm');
};

/**
 * Format time range
 */
export const formatTimeRange = (startTime: string, endTime: string): string => {
  const start = extractTime(startTime);
  const end = extractTime(endTime);
  return `${start} — ${end}`;
};

/**
 * Get shift duration in hours
 */
export const getShiftDuration = (startTime: string, endTime: string): number => {
  // Extract time parts without timezone conversion
  const startStr = extractTime(startTime);
  const endStr = extractTime(endTime);

  const [startHour, startMin] = startStr.split(':').map(Number);
  const [endHour, endMin] = endStr.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  return (endMinutes - startMinutes) / 60;
};

/**
 * Check if entry is for today
 */
export const isEntryToday = (entry: ScheduleEntry): boolean => {
  return isTodayFns(parseISO(entry.date));
};

/**
 * Check if date is today
 */
export const isToday = (date: Date): boolean => {
  return isTodayFns(date);
};

/**
 * Get entries for specific date
 */
export const getEntriesForDate = (
  entries: ScheduleEntry[],
  date: Date
): ScheduleEntry[] => {
  return entries.filter((entry) => isSameDay(parseISO(entry.date), date));
};

/**
 * Generate week days array
 */
export const getWeekDays = (baseDate: Date = new Date()): Date[] => {
  const start = startOfWeek(baseDate, { weekStartsOn: 1 });
  return eachDayOfInterval({
    start,
    end: addDays(start, 6),
  });
};

/**
 * Generate calendar days for month view
 */
export const getCalendarDays = (
  year: number,
  month: number,
  entries: ScheduleEntry[]
): ScheduleCalendarDay[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = startOfWeek(firstDay, { weekStartsOn: 1 });
  const endDate = addDays(
    startOfWeek(addDays(lastDay, 6), { weekStartsOn: 1 }),
    6
  );

  const days: ScheduleCalendarDay[] = [];
  let current = startDate;

  while (current <= endDate) {
    days.push({
      date: current,
      isCurrentMonth: current.getMonth() === month,
      isToday: isTodayFns(current),
      entries: getEntriesForDate(entries, current),
    });
    current = addDays(current, 1);
  }

  return days;
};

/**
 * Get day of week label (short)
 */
export const getDayLabel = (date: Date): string => {
  return format(date, 'EEEEEE', { locale: ru }).toUpperCase();
};

/**
 * Get day of week label (full)
 */
export const getDayLabelFull = (date: Date): string => {
  return format(date, 'EEEE', { locale: ru });
};

/**
 * Get month label
 */
export const getMonthLabel = (date: Date): string => {
  return format(date, 'LLLL yyyy', { locale: ru });
};

/**
 * Parse time string "HH:mm" to Date
 */
export const parseTimeString = (
  timeStr: string,
  baseDate: Date = new Date()
): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(baseDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
};

/**
 * Calculate total hours for entries
 */
export const calculateTotalHours = (entries: ScheduleEntry[]): number => {
  return entries.reduce((total, entry) => {
    return total + getShiftDuration(entry.start_time, entry.end_time);
  }, 0);
};

/**
 * Group entries by user
 */
export const groupEntriesByUser = (
  entries: ScheduleEntry[]
): Map<number, ScheduleEntry[]> => {
  const grouped = new Map<number, ScheduleEntry[]>();

  entries.forEach((entry) => {
    const existing = grouped.get(entry.user_id) || [];
    grouped.set(entry.user_id, [...existing, entry]);
  });

  return grouped;
};

/**
 * Group entries by date
 */
export const groupEntriesByDate = (
  entries: ScheduleEntry[]
): Record<string, ScheduleEntry[]> => {
  const grouped: Record<string, ScheduleEntry[]> = {};

  entries.forEach((entry) => {
    const dateKey = format(parseISO(entry.date), 'yyyy-MM-dd');
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(entry);
  });

  return grouped;
};
