/**
 * ActiveSessionsScreen
 * Экран управления активными сессиями (устройствами)
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import type { ActiveSession } from '../../../types/user.types';

export default function ActiveSessionsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { theme, isDark } = useTheme();

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

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
      <SafeAreaView style={{ backgroundColor: theme.card }} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Устройства</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* QR section */}
        {Platform.OS !== 'web' && (
          <View style={[styles.qrSection, { backgroundColor: theme.card }]}>
            <View style={[styles.qrImageContainer, { backgroundColor: theme.primary + '10' }]}>
              <Ionicons name="laptop-outline" size={56} color={theme.primary} />
              <View style={styles.qrIconOverlay}>
                <Ionicons name="qr-code-outline" size={24} color={theme.primary} />
              </View>
            </View>
            <Text style={[styles.qrTitle, { color: theme.text }]}>
              Вы можете зайти в приложение Тахион для компьютера с помощью QR-кода
            </Text>
            <TouchableOpacity
              style={[styles.connectButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('QRScanner')}
            >
              <Ionicons name="qr-code-outline" size={20} color="#FFF" />
              <Text style={styles.connectButtonText}>Подключить устройство</Text>
            </TouchableOpacity>
          </View>
        )}

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 100 : 140,
  },
  // QR Section
  qrSection: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  qrImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qrIconOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFF',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrTitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  connectButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  // Terminate button
  terminateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  terminateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
});
