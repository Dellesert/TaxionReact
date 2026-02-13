/**
 * Holidays API
 * API клиент для работы с производственным календарём
 */

import api from '@shared/api/axios.config';
import { API_ENDPOINTS } from '@shared/constants/api.constants';
import type { Holiday } from '../types/holidays.types';

interface HolidaysApiResponse {
  year: number;
  holidays: Holiday[];
  request_id: string;
}

/**
 * Получить праздники за указанный год
 */
export const getHolidays = async (year: number): Promise<Holiday[]> => {
  const response = await api.get<HolidaysApiResponse>(API_ENDPOINTS.CALENDAR.HOLIDAYS, {
    params: { year },
  });
  return response.data.holidays;
};
