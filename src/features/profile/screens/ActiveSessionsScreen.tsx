/**
 * ActiveSessionsScreen
 * Экран управления активными сессиями (устройствами)
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '@/navigation/ProfileNavigator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useActiveSessionsData } from '../hooks/useActiveSessionsData';
import { useActiveSessionsActions } from '../hooks/useActiveSessionsActions';
import { SessionCard } from '../components/sessions/SessionCard';
import { SessionsEmptyState } from '../components/sessions/SessionsEmptyState';
import { LogoutAllButton } from '../components/sessions/LogoutAllButton';
import type { ActiveSession } from '../../../types/user.types';

export default function ActiveSessionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { theme, isDark } = useTheme();

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'ios') {
        setStatusBarStyle(isDark ? 'light' : 'dark');
      }
    }, [isDark])
  );
  const { sessions, currentSessionId, loading, refreshing, handleRefresh, loadSessions } =
    useActiveSessionsData();
  const { handleDeleteSession, handleDeleteAllOther, handleRenameSession } = useActiveSessionsActions(
    currentSessionId,
    sessions,
    loadSessions
  );

  const renderSession = ({ item }: { item: ActiveSession }) => (
    <SessionCard
      session={item}
      currentSessionId={currentSessionId}
      onDelete={handleDeleteSession}
      onRename={handleRenameSession}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={{ backgroundColor: theme.card }} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Активные сессии</Text>
          {Platform.OS !== 'web' ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('QRScanner')}
              style={styles.headerRightButton}
            >
              <Ionicons name="qr-code-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRight} />
          )}
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
  headerRightButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 100 : 140,
  },
});
