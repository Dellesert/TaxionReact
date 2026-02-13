/**
 * useRussianHolidays Hook
 * Хук для работы с производственным календарём РФ
 * Загружает данные с бэкенда, с fallback на локальные данные
 */

import { useMemo, useEffect, useState, useCallback } from 'react';
import type { Holiday } from '../types/holidays.types';
import { getHolidays } from '../api/holidays.api';
import { RUSSIAN_HOLIDAYS } from '../constants/russianHolidays.constants';

interface UseRussianHolidaysResult {
  /** Все праздники за год (без moved_weekend) */
  holidays: Holiday[];
  /** Map для быстрого поиска праздника по дате (YYYY-MM-DD -> Holiday) */
  holidayMap: Map<string, Holiday>;
  /** Проверить является ли дата праздником */
  checkHoliday: (date: Date) => Holiday | null;
  /** Проверить является ли дата нерабочим днём (праздник или выходной) */
  checkNonWorking: (date: Date) => boolean;
  /** Загружаются ли данные */
  isLoading: boolean;
  /** Ошибка загрузки (null если нет) */
  error: string | null;
}

// In-memory кэш чтобы не дёргать API при каждом ремаунте
const holidayCache = new Map<number, Holiday[]>();

const formatDateToISO = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Хук для работы с праздниками РФ
 * @param year - год для получения праздников
 */
export const useRussianHolidays = (year: number): UseRussianHolidaysResult => {
  const [allHolidays, setAllHolidays] = useState<Holiday[]>(() => {
    // Инициализация из кэша или fallback на локальные данные
    return holidayCache.get(year) || RUSSIAN_HOLIDAYS[year] || [];
  });
  const [isLoading, setIsLoading] = useState(!holidayCache.has(year));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (holidayCache.has(year)) {
      setAllHolidays(holidayCache.get(year)!);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getHolidays(year);
        if (!cancelled) {
          holidayCache.set(year, data);
          setAllHolidays(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to fetch holidays');
          // Fallback: используем локальные данные
          const fallback = RUSSIAN_HOLIDAYS[year] || [];
          setAllHolidays(fallback);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [year]);

  // Праздники без moved_weekend (для отображения)
  const holidays = useMemo(() => {
    return allHolidays.filter(h => h.type !== 'moved_weekend');
  }, [allHolidays]);

  // Map для быстрого поиска (без moved_weekend)
  const holidayMap = useMemo(() => {
    const map = new Map<string, Holiday>();
    for (const holiday of allHolidays) {
      if (holiday.type !== 'moved_weekend') {
        map.set(holiday.date, holiday);
      }
    }
    return map;
  }, [allHolidays]);

  const checkHoliday = useCallback(
    (date: Date): Holiday | null => {
      const dateStr = formatDateToISO(date);
      return holidayMap.get(dateStr) || null;
    },
    [holidayMap],
  );

  const checkNonWorking = useCallback(
    (date: Date): boolean => {
      const dayOfWeek = date.getDay();
      const dateStr = formatDateToISO(date);

      // Проверяем перенесённый рабочий день
      const isMovedWorkday = allHolidays.some(
        h => h.date === dateStr && h.type === 'moved_weekend',
      );
      if (isMovedWorkday) return false;

      // Выходные (суббота=6, воскресенье=0)
      if (dayOfWeek === 0 || dayOfWeek === 6) return true;

      // Праздники
      return holidayMap.has(dateStr);
    },
    [allHolidays, holidayMap],
  );

  return {
    holidays,
    holidayMap,
    checkHoliday,
    checkNonWorking,
    isLoading,
    error,
  };
};

export default useRussianHolidays;
