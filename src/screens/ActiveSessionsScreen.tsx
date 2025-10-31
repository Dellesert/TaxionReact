/**
 * ActiveSessionsScreen
 * Экран управления активными сессиями (устройствами)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';
import * as sessionApi from '@api/session.api';
import type { ActiveSession } from '../types/user.types';

export default function ActiveSessionsScreen() {
  const navigation = useNavigation();
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load current session ID
  useEffect(() => {
    loadCurrentSessionId();
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

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
    } catch (error: any) {
      console.error('Failed to load sessions:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить список устройств');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, []);

  const handleDeleteSession = (session: ActiveSession) => {
    const isCurrentSession = session.session_id === currentSessionId;

    Alert.alert(
      'Удалить сессию?',
      isCurrentSession
        ? 'Вы действительно хотите выйти из текущего устройства? Придется войти заново.'
        : `Вы действительно хотите выйти из этого устройства?\n\n${getDeviceInfo(session.user_agent)}`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await sessionApi.deleteSession(session.session_id);
              Alert.alert('Успешно', 'Сессия удалена');

              if (isCurrentSession) {
                // If deleted current session, logout
                navigation.goBack();
              } else {
                // Reload sessions list
                loadSessions();
              }
            } catch (error: any) {
              console.error('Failed to delete session:', error);
              Alert.alert('Ошибка', 'Не удалось удалить сессию');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAllOther = () => {
    if (sessions.length <= 1) {
      Alert.alert('Нет других сессий', 'Это единственная активная сессия');
      return;
    }

    const otherCount = sessions.filter(s => s.session_id !== currentSessionId).length;

    Alert.alert(
      'Выйти со всех устройств?',
      `Вы действительно хотите выйти со всех других устройств? (${otherCount} ${otherCount === 1 ? 'устройство' : 'устройств'})`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await sessionApi.deleteAllOtherSessions();
              Alert.alert('Успешно', `Удалено сессий: ${response.deleted_count}`);
              loadSessions();
            } catch (error: any) {
              console.error('Failed to delete all sessions:', error);
              Alert.alert('Ошибка', 'Не удалось удалить сессии');
            }
          },
        },
      ]
    );
  };

  const getDeviceInfo = (userAgent: string): string => {
    // Parse user agent to get device info
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Неизвестное устройство';
  };

  const getDeviceIcon = (userAgent: string): any => {
    const device = getDeviceInfo(userAgent);
    if (device.includes('iPhone') || device.includes('iPad')) return 'phone-portrait-outline';
    if (device.includes('Android')) return 'phone-portrait-outline';
    if (device.includes('Mac') || device.includes('Windows') || device.includes('Linux')) return 'laptop-outline';
    return 'help-circle-outline';
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
    } catch {
      return dateString;
    }
  };

  const renderSession = ({ item }: { item: ActiveSession }) => {
    const isCurrentSession = item.session_id === currentSessionId;
    const deviceInfo = getDeviceInfo(item.user_agent);
    const deviceIcon = getDeviceIcon(item.user_agent);

    return (
      <View style={[styles.sessionCard, isCurrentSession && styles.currentSessionCard]}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Ionicons name={deviceIcon} size={24} color={isCurrentSession ? '#007AFF' : '#666'} />
            <View style={styles.sessionDetails}>
              <View style={styles.sessionTitleRow}>
                <Text style={styles.deviceName}>{deviceInfo}</Text>
                {isCurrentSession && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Текущее</Text>
                  </View>
                )}
              </View>
              <Text style={styles.sessionMeta}>IP: {item.ip_address}</Text>
              <Text style={styles.sessionMeta}>Последняя активность: {formatDate(item.last_active_at)}</Text>
              <Text style={styles.sessionMeta}>Создана: {formatDate(item.created_at)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteSession(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Активные сессии</Text>
        <View style={styles.headerRight} />
      </View>

      {!loading && sessions.length > 1 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.logoutAllButton}
            onPress={handleDeleteAllOther}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.logoutAllText}>Выйти со всех других устройств</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.session_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="phone-portrait-outline" size={64} color="#999" />
              <Text style={styles.emptyText}>Нет активных сессий</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  actionBar: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  logoutAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutAllText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  listContent: {
    padding: 16,
  },
  sessionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  currentSessionCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  sessionDetails: {
    marginLeft: 12,
    flex: 1,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  currentBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  sessionMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
});
