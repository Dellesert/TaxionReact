/**
 * useActiveSessionsData Hook
 * Управление данными активных сессий
 */

import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useNotification } from '@contexts/NotificationContext';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';
import * as sessionApi from '@api/session.api';
import type { ActiveSession } from '../types/user.types';

export const useActiveSessionsData = () => {
  const { showError } = useNotification();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load current session ID on mount
  useEffect(() => {
    loadCurrentSessionId();
  }, []);

  // Load sessions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const loadCurrentSessionId = async () => {
    try {
      const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      setCurrentSessionId(sessionId);
    } catch (error) {
      console.error('Failed to load current session ID:', error);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await sessionApi.getActiveSessions();
      setSessions(response.sessions || []);
    } catch (error: unknown) {
      console.error('Failed to load sessions:', error);
      showError('Не удалось загрузить список устройств');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, []);

  return {
    sessions,
    currentSessionId,
    loading,
    refreshing,
    handleRefresh,
    loadSessions,
  };
};
