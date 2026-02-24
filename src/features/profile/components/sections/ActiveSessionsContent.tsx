/**
 * Active Sessions Content
 * Контент для управления активными сессиями (без header)
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useActiveSessionsData } from '../../hooks/useActiveSessionsData';
import { useActiveSessionsActions } from '../../hooks/useActiveSessionsActions';
import { SessionCard } from '../sessions/SessionCard';
import type { ActiveSession } from '@/types/user.types';

const ActiveSessionsContent: React.FC = () => {
  const { theme } = useTheme();
  const { sessions, currentSessionId, loading, refreshing, handleRefresh, loadSessions } =
    useActiveSessionsData();
  const { handleDeleteSession, handleDeleteAllOther, handleRenameSession } = useActiveSessionsActions(
    currentSessionId,
    sessions,
    loadSessions
  );

  const currentSession = useMemo(
    () => sessions.find((s) => s.session_id === currentSessionId),
    [sessions, currentSessionId]
  );

  const otherSessions = useMemo(
    () => sessions.filter((s) => s.session_id !== currentSessionId),
    [sessions, currentSessionId]
  );

  const renderSession = (item: ActiveSession) => (
    <SessionCard
      key={item.session_id}
      session={item}
      currentSessionId={currentSessionId}
      onDelete={handleDeleteSession}
      onRename={handleRenameSession}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Current device section */}
        {currentSession && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              ЭТО УСТРОЙСТВО
            </Text>
            {renderSession(currentSession)}
            {otherSessions.length > 0 && (
              <TouchableOpacity
                style={[styles.terminateButton, { borderColor: theme.error }]}
                onPress={handleDeleteAllOther}
              >
                <Text style={[styles.terminateButtonText, { color: theme.error }]}>
                  Завершить другие сеансы
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Other sessions section */}
        {otherSessions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginTop: 24 }]}>
              АКТИВНЫЕ СЕАНСЫ
            </Text>
            {otherSessions.map(renderSession)}
          </>
        )}

        {/* Empty state */}
        {!loading && sessions.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="phone-portrait-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Нет активных сессий
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  terminateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    // @ts-ignore
    cursor: 'pointer',
  },
  terminateButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ActiveSessionsContent;
