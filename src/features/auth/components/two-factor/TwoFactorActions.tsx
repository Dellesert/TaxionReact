import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface TwoFactorActionsProps {
  isCodeComplete: boolean;
  isLoading: boolean;
  isResending: boolean;
  onVerify: () => void;
  onResendCode: () => void;
  onBack: () => void;
}

export const TwoFactorActions: React.FC<TwoFactorActionsProps> = ({
  isCodeComplete,
  isLoading,
  isResending,
  onVerify,
  onResendCode,
  onBack,
}) => {
  const { theme } = useTheme();

  return (
    <View>
      {/* Verify Button */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: theme.primary, shadowColor: theme.primary },
          (!isCodeComplete || isLoading) && styles.buttonDisabled,
        ]}
        onPress={onVerify}
        disabled={!isCodeComplete || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.buttonText}>Подтвердить</Text>
        )}
      </TouchableOpacity>

      {/* Resend Code */}
      <View style={styles.resendContainer}>
        <Text style={[styles.resendText, { color: theme.textSecondary }]}>Не получили код? </Text>
        <TouchableOpacity
          onPress={onResendCode}
          disabled={isResending || isLoading}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.resendLink,
              { color: theme.primary },
              (isResending || isLoading) && styles.resendLinkDisabled,
            ]}
          >
            Отправить повторно
          </Text>
        </TouchableOpacity>
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text style={[styles.backButtonText, { color: theme.textSecondary }]}>
          Вернуться к входу
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 14,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  resendLinkDisabled: {
    opacity: 0.5,
  },
  backButton: {
    padding: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
