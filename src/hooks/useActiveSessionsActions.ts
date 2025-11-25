/**
 * useActiveSessionsActions Hook
 * Действия с активными сессиями
 */

import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useNotification } from '@contexts/NotificationContext';
import { useActionModal } from '@contexts/ActionModalContext';
import * as sessionApi from '@api/session.api';
import { getDeleteSessionMessage, getDeleteAllOtherMessage } from '@utils/activeSessionsFormatters';
import { getOtherSessionsCount } from '@utils/activeSessionsHelpers';
import type { ActiveSession } from '../types/user.types';

export const useActiveSessionsActions = (
  currentSessionId: string | null,
  sessions: ActiveSession[],
  loadSessions: () => Promise<void>
) => {
  const navigation = useNavigation();
  const { showError, showSuccess } = useNotification();
  const { showConfirm } = useActionModal();

  /**
   * Delete a single session
   */
  const handleDeleteSession = async (session: ActiveSession) => {
    const isCurrentSession = session.session_id === currentSessionId;
    const message = getDeleteSessionMessage(session, currentSessionId);

    const performDelete = async () => {
      try {
        await sessionApi.deleteSession(session.session_id);
        showSuccess('Сессия удалена');

        if (isCurrentSession) {
          // If deleted current session, logout
          navigation.goBack();
        } else {
          // Reload sessions list
          loadSessions();
        }
      } catch (error: unknown) {
        console.error('Failed to delete session:', error);
        showError('Не удалось удалить сессию');
      }
    };

    if (Platform.OS === 'web') {
      // Use native confirm dialog for web
      if (window.confirm(`Удалить сессию?\n\n${message}`)) {
        await performDelete();
      }
    } else {
      // Use showConfirm for mobile
      showConfirm(
        'Удалить сессию?',
        message,
        performDelete,
        undefined,
        { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
      );
    }
  };

  /**
   * Delete all sessions except current
   */
  const handleDeleteAllOther = async () => {
    if (sessions.length <= 1) {
      showError('Это единственная активная сессия');
      return;
    }

    const otherCount = getOtherSessionsCount(sessions, currentSessionId);
    const message = getDeleteAllOtherMessage(sessions, currentSessionId);

    const performDeleteAll = async () => {
      try {
        const response = await sessionApi.deleteAllOtherSessions();
        showSuccess(`Удалено сессий: ${response.deleted_count}`);
        loadSessions();
      } catch (error: unknown) {
        console.error('Failed to delete all sessions:', error);
        showError('Не удалось удалить сессии');
      }
    };

    if (Platform.OS === 'web') {
      // Use native confirm dialog for web
      if (window.confirm(`Выйти со всех устройств?\n\n${message}`)) {
        await performDeleteAll();
      }
    } else {
      // Use showConfirm for mobile
      showConfirm(
        'Выйти со всех устройств?',
        message,
        performDeleteAll,
        undefined,
        { confirmText: 'Выйти', cancelText: 'Отмена', destructive: true }
      );
    }
  };

  return {
    handleDeleteSession,
    handleDeleteAllOther,
  };
};
