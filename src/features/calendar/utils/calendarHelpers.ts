import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, isSameDay, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Event } from '../types/calendar.types';

export interface EventSection {
  title: string;
  data: Event[];
}

/**
 * Calculate date range based on calendar view
 */
export const getDateRangeForView = (
  selectedDate: Date,
  view: 'day' | 'week' | 'month'
): { startDate: Date; endDate: Date } => {
  let startDate: Date;
  let endDate: Date;

  if (view === 'day') {
    startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(selectedDate);
    endDate.setHours(23, 59, 59, 999);
  } else if (view === 'week') {
    startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
    endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
  } else {
    startDate = startOfMonth(selectedDate);
    endDate = endOfMonth(selectedDate);
  }

  return { startDate, endDate };
};

/**
 * Format date range text based on calendar view
 */
export const formatDateRangeText = (
  selectedDate: Date,
  view: 'day' | 'week' | 'month'
): string => {
  if (view === 'day') {
    return format(selectedDate, 'd MMMM yyyy', { locale: ru });
  } else if (view === 'week') {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return `${format(start, 'd MMM', { locale: ru })} - ${format(end, 'd MMM', { locale: ru })}`;
  } else {
    return format(selectedDate, 'LLLL yyyy', { locale: ru });
  }
};

/**
 * Get local date key without timezone conversion (YYYY-MM-DD)
 */
export const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Group events by date into sections
 */
export const groupEventsByDate = (events: Event[]): EventSection[] => {
  if (!events || events.length === 0) {
    return [];
  }

  const sections: { [key: string]: Event[] } = {};

  // Group events by date
  events.forEach((event) => {
    const date = new Date(event.start_time);
    const dateKey = getLocalDateKey(date);

    if (!sections[dateKey]) {
      sections[dateKey] = [];
    }
    sections[dateKey].push(event);
  });

  // Get today and tomorrow keys
  const today = new Date();
  const todayKey = getLocalDateKey(today);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getLocalDateKey(tomorrow);

  // Sort sections by date and format titles
  const sortedSections = Object.keys(sections)
    .sort()
    .map((dateKey) => {
      const date = new Date(dateKey + 'T00:00:00');

      let title = '';
      if (dateKey === todayKey) {
        title = 'Сегодня';
      } else if (dateKey === tomorrowKey) {
        title = 'Завтра';
      } else {
        title = date.toLocaleDateString('ru-RU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
      }

      return {
        title,
        data: sections[dateKey].sort(
          (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        ),
      };
    });

  return sortedSections;
};

/**
 * Get view label text in Russian
 */
export const getViewLabel = (view: 'day' | 'week' | 'month'): string => {
  switch (view) {
    case 'day':
      return 'День';
    case 'week':
      return 'Неделя';
    case 'month':
      return 'Месяц';
    default:
      return '';
  }
};

/**
 * Get Monday of the week containing the given date
 */
export const getWeekMonday = (date: Date): Date => {
  return startOfWeek(date, { weekStartsOn: 1 });
};

/**
 * Get array of 7 days for the week (Monday to Sunday)
 */
export const getWeekDays = (weekStartDate: Date): Date[] => {
  return eachDayOfInterval({
    start: weekStartDate,
    end: addDays(weekStartDate, 6),
  });
};

/**
 * Format short weekday name (Пн, Вт, ...)
 */
export const formatWeekDayShort = (date: Date): string => {
  return format(date, 'EEEEEE', { locale: ru });
};

/**
 * Check if two dates are the same day
 */
export const areSameDay = (date1: Date, date2: Date): boolean => {
  return isSameDay(date1, date2);
};
