/**
 * useRussianHolidays Hook
 * Хук для работы с производственным календарём РФ
 */

import { useMemo } from 'react';
import type { Holiday } from '../types/holidays.types';
import {
  RUSSIAN_HOLIDAYS,
  getHoliday,
  isNonWorkingDay,
  getHolidaysForYear,
} from '../constants/russianHolidays.constants';

interface UseRussianHolidaysResult {
  /** Все праздники за год */
  holidays: Holiday[];
  /** Map для быстрого поиска праздника по дате (YYYY-MM-DD -> Holiday) */
  holidayMap: Map<string, Holiday>;
  /** Проверить является ли дата праздником */
  checkHoliday: (date: Date) => Holiday | null;
  /** Проверить является ли дата нерабочим днём (праздник или выходной) */
  checkNonWorking: (date: Date) => boolean;
}

/**
 * Хук для работы с праздниками РФ
 * @param year - год для получения праздников
 */
export const useRussianHolidays = (year: number): UseRussianHolidaysResult => {
  // Получаем праздники за год
  const holidays = useMemo(() => {
    return getHolidaysForYear(year);
  }, [year]);

  // Создаём Map для быстрого поиска
  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    const allHolidays = RUSSIAN_HOLIDAYS[year] || [];
    for (const holiday of allHolidays) {
      if (holiday.type !== 'moved_weekend') {
        map.set(holiday.date, holiday);
      }
    }
    return map;
  }, [year]);

  // Функция проверки праздника
  const checkHoliday = useMemo(() => {
    return (date: Date): Holiday | null => {
      return getHoliday(date, year);
    };
  }, [year]);

  // Функция проверки нерабочего дня
  const checkNonWorking = useMemo(() => {
    return (date: Date): boolean => {
      return isNonWorkingDay(date, year);
    };
  }, [year]);

  return {
    holidays,
    holidayMap,
    checkHoliday,
    checkNonWorking,
  };
};

export default useRussianHolidays;
