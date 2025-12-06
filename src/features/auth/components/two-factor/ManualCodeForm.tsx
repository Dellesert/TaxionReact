import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { ErrorDisplay } from '../common/ErrorDisplay';

interface ManualCodeFormProps {
  code: string;
  error: string | null;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
  onShowEmailForm: () => void;
  onBackToLogin: () => void;
}

export const ManualCodeForm: React.FC<ManualCodeFormProps> = ({
  code,
  error,
  onCodeChange,
  onSubmit,
  onShowEmailForm,
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
        placeholder="Введите код восстановления"
        placeholderTextColor={theme.inputPlaceholder}
        value={code}
        onChangeText={onCodeChange}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {error && <ErrorDisplay message={error} />}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={onSubmit}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Продолжить</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={onShowEmailForm}>
        <Text style={[styles.linkButtonText, { color: theme.primary }]}>Отправить код на email</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={onBackToLogin}>
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 12,
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
