/**
 * PasskeyEmptyState Component
 * Пустое состояние списка Passkey
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

interface PasskeyEmptyStateProps {
  isLoading: boolean;
  isSupported: boolean;
}

export const PasskeyEmptyState: React.FC<PasskeyEmptyStateProps> = ({ isLoading, isSupported }) => {
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.emptyState}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!isSupported) {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="lock-closed-outline"
          size={64}
          color={theme.textTertiary}
          style={styles.emptyIcon}
        />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Не поддерживается</Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Passkey не поддерживается на этом устройстве. Для использования Passkey требуется iOS
          16+, Android 9+, или современный веб-браузер с поддержкой WebAuthn.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.emptyState}>
      <Ionicons name="key-outline" size={64} color={theme.textTertiary} style={styles.emptyIcon} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>Нет Passkey</Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        Вы еще не добавили ни одного Passkey. Добавьте Passkey для быстрого и безопасного входа.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
