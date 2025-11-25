/**
 * ActiveSessionsScreen
 * Экран управления активными сессиями (устройствами)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useActiveSessionsData } from '../hooks/useActiveSessionsData';
import { useActiveSessionsActions } from '../hooks/useActiveSessionsActions';
import { SessionCard } from '../components/SessionCard';
import { SessionsEmptyState } from '../components/SessionsEmptyState';
import { LogoutAllButton } from '../components/LogoutAllButton';
import type { ActiveSession } from '../../../types/user.types';

export default function ActiveSessionsScreen() {
  const navigation = useNavigation();
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
      <SafeAreaView style={{ backgroundColor: theme.card }} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Активные сессии</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  listContent: {
    padding: 16,
  },
});
