/**
 * Active Sessions Formatters
 * Форматирование данных для активных сессий
 */

import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { getDeviceInfo, getOtherSessionsCount, getDeviceCountText } from './activeSessionsHelpers';
import type { ActiveSession } from '../../../types/user.types';

/**
 * Format date string to readable format
 */
export const formatSessionDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
  } catch {
    return dateString;
  }
};

/**
 * Get confirmation message for deleting single session
 */
export const getDeleteSessionMessage = (
  session: ActiveSession,
  currentSessionId: string | null
): string => {
  const isCurrent = session.session_id === currentSessionId;

  if (isCurrent) {
    return 'Вы действительно хотите выйти из текущего устройства? Придется войти заново.';
  }

  return `Вы действительно хотите выйти из этого устройства?\n\n${getDeviceInfo(session.user_agent)}`;
};

/**
 * Get confirmation message for deleting all other sessions
 */
export const getDeleteAllOtherMessage = (
  sessions: ActiveSession[],
  currentSessionId: string | null
): string => {
  const otherCount = getOtherSessionsCount(sessions, currentSessionId);
  const deviceText = getDeviceCountText(otherCount);

  return `Вы действительно хотите выйти со всех других устройств? (${otherCount} ${deviceText})`;
};
