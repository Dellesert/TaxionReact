/**
 * Holiday Types
 * Типы для производственного календаря
 */

// Тип праздничного/нерабочего дня
export type HolidayType = 'holiday' | 'shortened' | 'moved_weekend';

// Праздничный день
export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: HolidayType;
}

// Праздники за год
export interface HolidayYear {
  year: number;
  holidays: Holiday[];
}
