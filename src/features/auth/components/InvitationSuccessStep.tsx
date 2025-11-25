import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface InvitationSuccessStepProps {
  onNavigateToLogin: () => void;
}

export const InvitationSuccessStep: React.FC<InvitationSuccessStepProps> = ({ onNavigateToLogin }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.form, { backgroundColor: theme.card }]}>
      <View style={styles.successBox}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={[styles.successTitle, { color: theme.text }]}>Успешно!</Text>
        <Text style={[styles.successMessage, { color: theme.textSecondary }]}>
          Ваш аккаунт активирован. Сейчас вы будете перенаправлены на страницу входа.
        </Text>
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: theme.primary }]} onPress={onNavigateToLogin}>
        <Text style={styles.buttonText}>Перейти к входу</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  successBox: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  loader: {
    marginTop: 20,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
