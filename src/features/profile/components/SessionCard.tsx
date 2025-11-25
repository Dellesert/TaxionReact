/**
 * SessionCard Component
 * Карточка активной сессии
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { getDeviceInfo, getDeviceIcon, isCurrentSession } from '../utils/activeSessionsHelpers';
import { formatSessionDate } from '../utils/activeSessionsFormatters';
import type { ActiveSession } from '../../../types/user.types';

interface SessionCardProps {
  session: ActiveSession;
  currentSessionId: string | null;
  onDelete: (session: ActiveSession) => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  currentSessionId,
  onDelete,
}) => {
  const { theme } = useTheme();
  const isCurrent = isCurrentSession(session.session_id, currentSessionId);
  const deviceInfo = getDeviceInfo(session.user_agent);
  const deviceIcon = getDeviceIcon(session.user_agent);

  return (
    <View
      style={[
        styles.sessionCard,
        { backgroundColor: theme.card, borderColor: theme.border },
        isCurrent && { borderColor: theme.primary, borderWidth: 2 },
      ]}
    >
      <View style={styles.sessionHeader}>
        <View style={styles.sessionInfo}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name={deviceIcon as any} size={24} color={theme.primary} />
          </View>
          <View style={styles.sessionDetails}>
            <View style={styles.sessionTitleRow}>
              <Text style={[styles.deviceName, { color: theme.text }]}>{deviceInfo}</Text>
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.currentBadgeText}>Текущее</Text>
                </View>
              )}
            </View>
            <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
              IP: {session.ip_address}
            </Text>
            <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
              Активность: {formatSessionDate(session.last_active_at)}
            </Text>
            <Text style={[styles.sessionMeta, { color: theme.textTertiary }]}>
              Создана: {formatSessionDate(session.created_at)}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.deleteButton} onPress={() => onDelete(session)}>
          <Ionicons name="trash-outline" size={22} color={theme.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  sessionInfo: {
    flexDirection: 'row',
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDetails: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    flexShrink: 0,
  },
  sessionMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    flexShrink: 0,
  },
});
