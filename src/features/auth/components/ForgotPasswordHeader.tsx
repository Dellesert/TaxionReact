import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const ForgotPasswordHeader: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Забыли пароль?</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Введите ваш email, и мы отправим вам инструкции для сброса пароля
      </Text>
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
    lineHeight: 24,
  },
});
