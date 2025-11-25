import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { ErrorDisplay } from './ErrorDisplay';

interface EmailRequestFormProps {
  email: string;
  error: string | null;
  isLoading: boolean;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
  onShowManualCode: () => void;
  onBackToLogin: () => void;
}

export const EmailRequestForm: React.FC<EmailRequestFormProps> = ({
  email,
  error,
  isLoading,
  onEmailChange,
  onSubmit,
  onShowManualCode,
  onBackToLogin,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        placeholder="Email"
        placeholderTextColor={theme.inputPlaceholder}
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        editable={!isLoading}
      />

      {error && <ErrorDisplay message={error} />}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }, isLoading && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Отправить инструкции</Text>
        )}
      </TouchableOpacity>

      <View style={[styles.dividerContainer, { borderColor: theme.border }]}>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.dividerText, { color: theme.textSecondary }]}>или</Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
      </View>

      <TouchableOpacity style={styles.linkButton} onPress={onShowManualCode} disabled={isLoading}>
        <Text style={[styles.linkButtonText, { color: theme.primary }]}>У меня уже есть код</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={onBackToLogin} disabled={isLoading}>
        <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>Вернуться к входу</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  button: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  linkButton: {
    alignItems: 'center',
    padding: 12,
  },
  linkButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
  },
});
