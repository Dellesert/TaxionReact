/**
 * Russian Holidays Constants
 * Производственный календарь РФ
 */

import type { Holiday } from '../types/holidays.types';

/**
 * Праздники РФ по годам
 * Источник: Постановления Правительства РФ о переносе выходных дней
 */
export const RUSSIAN_HOLIDAYS: Record<number, Holiday[]> = {
  2024: [
    // Новогодние каникулы
    { date: '2024-01-01', name: 'Новый год', type: 'holiday' },
    { date: '2024-01-02', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2024-01-03', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2024-01-04', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2024-01-05', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2024-01-06', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2024-01-07', name: 'Рождество Христово', type: 'holiday' },
    { date: '2024-01-08', name: 'Новогодние каникулы', type: 'holiday' },
    // 23 февраля
    { date: '2024-02-23', name: 'День защитника Отечества', type: 'holiday' },
    // 8 марта
    { date: '2024-03-08', name: 'Международный женский день', type: 'holiday' },
    // Май
    { date: '2024-05-01', name: 'Праздник Весны и Труда', type: 'holiday' },
    { date: '2024-05-09', name: 'День Победы', type: 'holiday' },
    // День России
    { date: '2024-06-12', name: 'День России', type: 'holiday' },
    // День народного единства
    { date: '2024-11-04', name: 'День народного единства', type: 'holiday' },
    // Перенесённые выходные (рабочие субботы)
    { date: '2024-04-27', name: 'Рабочий день (за 29 апреля)', type: 'moved_weekend' },
    { date: '2024-11-02', name: 'Рабочий день (за 3 ноября)', type: 'moved_weekend' },
    { date: '2024-12-28', name: 'Рабочий день (за 31 декабря)', type: 'moved_weekend' },
  ],
  2025: [
    // Новогодние каникулы
    { date: '2025-01-01', name: 'Новый год', type: 'holiday' },
    { date: '2025-01-02', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2025-01-03', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2025-01-04', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2025-01-05', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2025-01-06', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2025-01-07', name: 'Рождество Христово', type: 'holiday' },
    { date: '2025-01-08', name: 'Новогодние каникулы', type: 'holiday' },
    // 23 февраля (воскресенье, перенос на 24)
    { date: '2025-02-23', name: 'День защитника Отечества', type: 'holiday' },
    { date: '2025-02-24', name: 'День защитника Отечества (перенос)', type: 'holiday' },
    // 8 марта (суббота, перенос на 10)
    { date: '2025-03-08', name: 'Международный женский день', type: 'holiday' },
    { date: '2025-03-10', name: 'Международный женский день (перенос)', type: 'holiday' },
    // Май
    { date: '2025-05-01', name: 'Праздник Весны и Труда', type: 'holiday' },
    { date: '2025-05-02', name: 'Праздник Весны и Труда (перенос)', type: 'holiday' },
    { date: '2025-05-09', name: 'День Победы', type: 'holiday' },
    // День России (четверг)
    { date: '2025-06-12', name: 'День России', type: 'holiday' },
    { date: '2025-06-13', name: 'День России (перенос)', type: 'holiday' },
    // День народного единства (вторник)
    { date: '2025-11-03', name: 'День народного единства (перенос)', type: 'holiday' },
    { date: '2025-11-04', name: 'День народного единства', type: 'holiday' },
    // 31 декабря
    { date: '2025-12-31', name: 'Новогодние каникулы', type: 'holiday' },
  ],
  2026: [
    // Новогодние каникулы
    { date: '2026-01-01', name: 'Новый год', type: 'holiday' },
    { date: '2026-01-02', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2026-01-03', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2026-01-04', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2026-01-05', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2026-01-06', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2026-01-07', name: 'Рождество Христово', type: 'holiday' },
    { date: '2026-01-08', name: 'Новогодние каникулы', type: 'holiday' },
    // 23 февраля (понедельник)
    { date: '2026-02-23', name: 'День защитника Отечества', type: 'holiday' },
    // 8 марта (воскресенье, перенос на 9)
    { date: '2026-03-08', name: 'Международный женский день', type: 'holiday' },
    { date: '2026-03-09', name: 'Международный женский день (перенос)', type: 'holiday' },
    // Май
    { date: '2026-05-01', name: 'Праздник Весны и Труда', type: 'holiday' },
    { date: '2026-05-09', name: 'День Победы', type: 'holiday' },
    { date: '2026-05-11', name: 'День Победы (перенос)', type: 'holiday' },
    // День России (пятница)
    { date: '2026-06-12', name: 'День России', type: 'holiday' },
    // День народного единства (среда)
    { date: '2026-11-04', name: 'День народного единства', type: 'holiday' },
    // 31 декабря
    { date: '2026-12-31', name: 'Новогодние каникулы', type: 'holiday' },
  ],
  2027: [
    // Новогодние каникулы
    { date: '2027-01-01', name: 'Новый год', type: 'holiday' },
    { date: '2027-01-02', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2027-01-03', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2027-01-04', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2027-01-05', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2027-01-06', name: 'Новогодние каникулы', type: 'holiday' },
    { date: '2027-01-07', name: 'Рождество Христово', type: 'holiday' },
    { date: '2027-01-08', name: 'Новогодние каникулы', type: 'holiday' },
    // 23 февраля (вторник)
    { date: '2027-02-23', name: 'День защитника Отечества', type: 'holiday' },
    // 8 марта (понедельник)
    { date: '2027-03-08', name: 'Международный женский день', type: 'holiday' },
    // Май
    { date: '2027-05-01', name: 'Праздник Весны и Труда', type: 'holiday' },
    { date: '2027-05-03', name: 'Праздник Весны и Труда (перенос)', type: 'holiday' },
    { date: '2027-05-09', name: 'День Победы', type: 'holiday' },
    { date: '2027-05-10', name: 'День Победы (перенос)', type: 'holiday' },
    // День России (суббота, перенос на 14)
    { date: '2027-06-12', name: 'День России', type: 'holiday' },
    { date: '2027-06-14', name: 'День России (перенос)', type: 'holiday' },
    // День народного единства (четверг)
    { date: '2027-11-04', name: 'День народного единства', type: 'holiday' },
    { date: '2027-11-05', name: 'День народного единства (перенос)', type: 'holiday' },
    // 31 декабря
    { date: '2027-12-31', name: 'Новогодние каникулы', type: 'holiday' },
  ],
};

/**
 * Форматирование даты в строку YYYY-MM-DD
 */
const formatDateToISO = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Проверка является ли дата праздником
 * @param date - дата для проверки
 * @param year - год (опционально, берётся из даты)
 * @returns объект Holiday или null
 */
export const getHoliday = (date: Date, year?: number): Holiday | null => {
  const targetYear = year ?? date.getFullYear();
  const dateStr = formatDateToISO(date);
  const holidays = RUSSIAN_HOLIDAYS[targetYear];
  if (!holidays) return null;
  return holidays.find(h => h.date === dateStr && h.type !== 'moved_weekend') || null;
};

/**
 * Проверка является ли дата рабочим выходным (перенесённый рабочий день)
 * @param date - дата для проверки
 * @param year - год (опционально)
 * @returns true если это рабочий день вместо выходного
 */
export const isMovedWorkday = (date: Date, year?: number): boolean => {
  const targetYear = year ?? date.getFullYear();
  const dateStr = formatDateToISO(date);
  const holidays = RUSSIAN_HOLIDAYS[targetYear];
  if (!holidays) return false;
  return holidays.some(h => h.date === dateStr && h.type === 'moved_weekend');
};

/**
 * Проверка является ли дата выходным или праздником
 * @param date - дата для проверки
 * @param year - год (опционально)
 * @returns true если нерабочий день
 */
export const isNonWorkingDay = (date: Date, year?: number): boolean => {
  const dayOfWeek = date.getDay();

  // Проверяем перенесённый рабочий день (суббота/воскресенье которые рабочие)
  if (isMovedWorkday(date, year)) {
    return false;
  }

  // Выходные (суббота=6, воскресенье=0)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }

  // Праздники
  const holiday = getHoliday(date, year);
  return holiday !== null;
};

/**
 * Получить все праздники за год
 * @param year - год
 * @returns массив праздников (без moved_weekend)
 */
export const getHolidaysForYear = (year: number): Holiday[] => {
  const holidays = RUSSIAN_HOLIDAYS[year];
  if (!holidays) return [];
  return holidays.filter(h => h.type !== 'moved_weekend');
};
