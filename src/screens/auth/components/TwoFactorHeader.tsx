import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface TwoFactorHeaderProps {
  email: string;
}

export const TwoFactorHeader: React.FC<TwoFactorHeaderProps> = ({ email }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Двухфакторная аутентификация</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Мы отправили 6-значный код на
      </Text>
      <Text style={[styles.email, { color: theme.primary }]}>{email}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
