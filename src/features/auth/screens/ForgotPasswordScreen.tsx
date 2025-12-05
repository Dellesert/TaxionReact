/**
 * Forgot Password Screen
 * Экран запроса сброса пароля
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { usePasswordReset } from '../hooks/usePasswordReset';
import { validateResetCode } from '../utils/passwordResetHelpers';
import { ForgotPasswordHeader } from '../components/ForgotPasswordHeader';
import { EmailRequestForm } from '../components/EmailRequestForm';
import { ManualCodeForm } from '../components/ManualCodeForm';
import { PasswordResetSuccess } from '../components/PasswordResetSuccess';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { showModal, hideModal } = useActionModal();
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();

  // State
  const [email, setEmail] = useState('');
  const [showManualCodeInput, setShowManualCodeInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualCodeError, setManualCodeError] = useState<string | null>(null);

  // Custom hook
  const { isLoading, error, success, requestReset, clearError } = usePasswordReset();

  // Handlers
  const handleSubmit = async () => {
    try {
      await requestReset(email);

      showModal({
        title: 'Запрос отправлен',
        message:
          'Если учётная запись с таким email существует, вы получите письмо с инструкциями для сброса пароля.',
        actions: [
          {
            text: 'OK',
            onPress: () => {
              hideModal();
              navigation.navigate('Login');
            },
            style: 'primary',
          },
        ],
      });
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleManualCodeSubmit = () => {
    setManualCodeError(null);

    const validation = validateResetCode(manualCode);
    if (!validation.isValid) {
      setManualCodeError(validation.error || 'Ошибка валидации');
      return;
    }

    try {
      navigation.navigate('ResetPassword', { token: manualCode.trim() });
    } catch (err: any) {
      setManualCodeError(err.message || 'Не удалось перейти к сбросу пароля');
    }
  };

  const handleShowManualCode = () => {
    setShowManualCodeInput(true);
    clearError();
    setManualCodeError(null);
  };

  const handleShowEmailForm = () => {
    setShowManualCodeInput(false);
    setManualCode('');
    setManualCodeError(null);
    clearError();
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  // Desktop layout
  if (isWideScreen) {
    return (
      <View style={[styles.desktopContainer, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.desktopCard,
            {
              backgroundColor: theme.card,
              ...Platform.select({
                web: {
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                },
                default: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 30,
                  elevation: 20,
                },
              }),
            },
          ]}
        >
          <ForgotPasswordHeader />

          {!success ? (
            !showManualCodeInput ? (
              <EmailRequestForm
                email={email}
                error={error}
                isLoading={isLoading}
                onEmailChange={setEmail}
                onSubmit={handleSubmit}
                onShowManualCode={handleShowManualCode}
                onBackToLogin={handleBackToLogin}
              />
            ) : (
              <ManualCodeForm
                code={manualCode}
                error={manualCodeError}
                onCodeChange={setManualCode}
                onSubmit={handleManualCodeSubmit}
                onShowEmailForm={handleShowEmailForm}
                onBackToLogin={handleBackToLogin}
              />
            )
          ) : (
            <PasswordResetSuccess onBackToLogin={handleBackToLogin} />
          )}
        </View>
      </View>
    );
  }

  // Mobile layout
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <ForgotPasswordHeader />

          {!success ? (
            !showManualCodeInput ? (
              <EmailRequestForm
                email={email}
                error={error}
                isLoading={isLoading}
                onEmailChange={setEmail}
                onSubmit={handleSubmit}
                onShowManualCode={handleShowManualCode}
                onBackToLogin={handleBackToLogin}
              />
            ) : (
              <ManualCodeForm
                code={manualCode}
                error={manualCodeError}
                onCodeChange={setManualCode}
                onSubmit={handleManualCodeSubmit}
                onShowEmailForm={handleShowEmailForm}
                onBackToLogin={handleBackToLogin}
              />
            )
          ) : (
            <PasswordResetSuccess onBackToLogin={handleBackToLogin} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Mobile styles
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  // Desktop styles
  desktopContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  desktopCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    padding: 48,
  },
});

export default ForgotPasswordScreen;
