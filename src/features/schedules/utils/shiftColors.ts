import type { ShiftType, ScheduleType } from '../types/schedule.types';

export interface ShiftColorSet {
  background: string;
  text: string;
  border: string;
}

export const SHIFT_COLORS: Record<ShiftType, ShiftColorSet> = {
  morning: {
    background: '#FEF3C7',
    text: '#D97706',
    border: '#FCD34D',
  },
  evening: {
    background: '#DBEAFE',
    text: '#2563EB',
    border: '#93C5FD',
  },
  full_day: {
    background: '#D1FAE5',
    text: '#059669',
    border: '#6EE7B7',
  },
  custom: {
    background: '#F3E8FF',
    text: '#7C3AED',
    border: '#C4B5FD',
  },
};

export const getShiftColor = (shiftType: ShiftType): ShiftColorSet => {
  return SHIFT_COLORS[shiftType] || SHIFT_COLORS.custom;
};

export const SCHEDULE_TYPE_COLORS: Record<ScheduleType, string> = {
  work: '#4CAF50',
  paid_services: '#2196F3',
  on_duty: '#FF9800',
  shift: '#9C27B0',
  custom: '#607D8B',
};

export const getScheduleTypeColor = (type: ScheduleType): string => {
  return SCHEDULE_TYPE_COLORS[type] || SCHEDULE_TYPE_COLORS.custom;
};
