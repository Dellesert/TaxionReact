import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InvitationData } from '../../utils/invitationHelpers';
import { InvitationInfoBox } from './InvitationInfoBox';
import { useTheme } from '@shared/hooks/useTheme';
import { usePasswordPolicy } from '@shared/hooks/usePasswordPolicy';

interface InvitationPasswordStepProps {
  invitationData: InvitationData | null;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  showConfirmPassword: boolean;
  isLoading: boolean;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  onTogglePassword: () => void;
  onToggleConfirmPassword: () => void;
  onAccept: () => void;
  onBack: () => void;
}

export const InvitationPasswordStep: React.FC<InvitationPasswordStepProps> = ({
  invitationData,
  password,
  confirmPassword,
  showPassword,
  showConfirmPassword,
  isLoading,
  onPasswordChange,
  onConfirmPasswordChange,
  onTogglePassword,
  onToggleConfirmPassword,
  onAccept,
  onBack,
}) => {
  const { theme } = useTheme();
  const { getPasswordHint } = usePasswordPolicy();

  return (
    <View style={[styles.form, { backgroundColor: theme.card }]}>
      {/* Информация о приглашении */}
      {invitationData && <InvitationInfoBox data={invitationData} />}

      {/* Поле для создания пароля */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Создайте пароль</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              {
                backgroundColor: theme.backgroundTertiary,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={password}
            onChangeText={onPasswordChange}
            placeholder={getPasswordHint()}
            placeholderTextColor={theme.inputPlaceholder}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!isLoading}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={onTogglePassword} activeOpacity={0.7}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Поле для подтверждения пароля */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Подтвердите пароль</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              {
                backgroundColor: theme.backgroundTertiary,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            value={confirmPassword}
            onChangeText={onConfirmPasswordChange}
            placeholder="Повторите пароль"
            placeholderTextColor={theme.inputPlaceholder}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            editable={!isLoading}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={onToggleConfirmPassword} activeOpacity={0.7}>
            <Ionicons
              name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }, isLoading && styles.buttonDisabled]}
        onPress={onAccept}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Активировать аккаунт</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={onBack}>
        <Text style={[styles.linkText, { color: theme.primary }]}>← Назад</Text>
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
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    paddingRight: 50,
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
