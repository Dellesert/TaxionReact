/**
 * Active Sessions Content
 * Контент для управления активными сессиями (без header)
 */

import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useActiveSessionsData } from '../../hooks/useActiveSessionsData';
import { useActiveSessionsActions } from '../../hooks/useActiveSessionsActions';
import { SessionCard } from '../../components/SessionCard';
import { SessionsEmptyState } from '../../components/SessionsEmptyState';
import { LogoutAllButton } from '../../components/LogoutAllButton';
import type { ActiveSession } from '@/types/user.types';

const ActiveSessionsContent: React.FC = () => {
  const { theme } = useTheme();
  const { sessions, currentSessionId, loading, refreshing, handleRefresh, loadSessions } =
    useActiveSessionsData();
  const { handleDeleteSession, handleDeleteAllOther } = useActiveSessionsActions(
    currentSessionId,
    sessions,
    loadSessions
  );

  const renderSession = ({ item }: { item: ActiveSession }) => (
    <SessionCard session={item} currentSessionId={currentSessionId} onDelete={handleDeleteSession} />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LogoutAllButton onPress={handleDeleteAllOther} visible={!loading && sessions.length > 1} />

      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.session_id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<SessionsEmptyState loading={loading} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
});

export default ActiveSessionsContent;
