import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { formatExpiryTime } from '../utils/passwordResetHelpers';

interface ResetPasswordHeaderProps {
  email: string;
  expiresAt?: string;
}

export const ResetPasswordHeader: React.FC<ResetPasswordHeaderProps> = ({ email, expiresAt }) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Сброс пароля</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Установите новый пароль для {email}</Text>

      {expiresAt && (
        <View
          style={[
            styles.infoBox,
            {
              backgroundColor: isDark ? '#1E3A5F' : '#DBEAFE',
              borderLeftColor: isDark ? '#60A5FA' : '#3B82F6',
            },
          ]}
        >
          <Text style={[styles.infoText, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
            Ссылка действительна до: {formatExpiryTime(expiresAt)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  infoText: {
    fontSize: 14,
  },
});
