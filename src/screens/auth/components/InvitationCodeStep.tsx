import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface InvitationCodeStepProps {
  code: string;
  isLoading: boolean;
  onCodeChange: (code: string) => void;
  onContinue: () => void;
  onNavigateToLogin: () => void;
}

export const InvitationCodeStep: React.FC<InvitationCodeStepProps> = ({
  code,
  isLoading,
  onCodeChange,
  onContinue,
  onNavigateToLogin,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.form, { backgroundColor: theme.card }]}>
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Код приглашения</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundTertiary,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          value={code}
          onChangeText={onCodeChange}
          placeholder="Введите код из письма"
          placeholderTextColor={theme.inputPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        <Text style={[styles.hint, { color: theme.textTertiary }]}>
          Код находится в письме-приглашении
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }, isLoading && styles.buttonDisabled]}
        onPress={onContinue}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Продолжить</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={onNavigateToLogin}>
        <Text style={[styles.linkText, { color: theme.primary }]}>Уже есть аккаунт? Войти</Text>
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
