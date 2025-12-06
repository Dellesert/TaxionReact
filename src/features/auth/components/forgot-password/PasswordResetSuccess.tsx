import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface PasswordResetSuccessProps {
  onBackToLogin: () => void;
}

export const PasswordResetSuccess: React.FC<PasswordResetSuccessProps> = ({ onBackToLogin }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: theme.backgroundTertiary }]}>
        <Text style={styles.iconText}>✉️</Text>
      </View>
      <Text style={[styles.title, { color: theme.text }]}>Проверьте почту!</Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>
        Если учётная запись с таким email существует, вы получите письмо с инструкциями для сброса пароля.
      </Text>
      <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={onBackToLogin}>
        <Text style={styles.buttonText}>Вернуться к входу</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
