import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ErrorDisplay } from './ErrorDisplay';

interface ResetPasswordFormProps {
  password: string;
  confirmPassword: string;
  error: string | null;
  isLoading: boolean;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({
  password,
  confirmPassword,
  error,
  isLoading,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
  onCancel,
}) => {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[
            styles.input,
            styles.passwordInput,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="Новый пароль"
          placeholderTextColor={theme.inputPlaceholder}
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry={!showPassword}
          autoComplete="password-new"
          editable={!isLoading}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={24}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.passwordContainer}>
        <TextInput
          style={[
            styles.input,
            styles.passwordInput,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholder="Подтвердите пароль"
          placeholderTextColor={theme.inputPlaceholder}
          value={confirmPassword}
          onChangeText={onConfirmPasswordChange}
          secureTextEntry={!showConfirmPassword}
          autoComplete="password-new"
          editable={!isLoading}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
            size={24}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.hint}>
        <Text style={[styles.hintText, { color: theme.textSecondary }]}>
          Пароль должен содержать минимум 8 символов
        </Text>
      </View>

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
          <Text style={styles.buttonText}>Установить новый пароль</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isLoading}>
        <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Отмена</Text>
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
  passwordContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 16,
  },
  passwordInput: {
    paddingRight: 50,
    marginBottom: 0,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  hint: {
    marginBottom: 16,
  },
  hintText: {
    fontSize: 12,
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
  cancelButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    fontSize: 16,
  },
});
