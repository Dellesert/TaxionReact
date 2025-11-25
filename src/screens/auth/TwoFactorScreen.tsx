/**
 * Two-Factor Authentication Screen
 * Экран для ввода 2FA кода
 */

import React, { useState, useEffect } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { useActionModal } from '@contexts/ActionModalContext';
import { useNotification } from '@contexts/NotificationContext';
import { useTheme } from '@hooks/useTheme';
import { use2FACodeInput } from '@hooks/use2FACodeInput';
import { use2FAVerification } from '@hooks/use2FAVerification';
import { use2FAAnimation } from '@hooks/use2FAAnimation';
import { isCodeComplete as checkCodeComplete } from '@utils/twoFactorHelpers';
import { TwoFactorHeader } from './components/TwoFactorHeader';
import { CodeInputGrid } from './components/CodeInputGrid';
import { TwoFactorActions } from './components/TwoFactorActions';

type TwoFactorScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'TwoFactor'>;
type TwoFactorScreenRouteProp = RouteProp<AuthStackParamList, 'TwoFactor'>;

const TwoFactorScreen: React.FC = () => {
  const navigation = useNavigation<TwoFactorScreenNavigationProp>();
  const route = useRoute<TwoFactorScreenRouteProp>();
  const { email } = route.params;
  const { showConfirm } = useActionModal();
  const notification = useNotification();
  const { theme } = useTheme();

  const [isResending, setIsResending] = useState(false);

  // Hooks
  const { code, inputRefs, handleCodeChange, handleKeyPress, clearCode, focusFirstInput } =
    use2FACodeInput();
  const { isLoading, handleVerify } = use2FAVerification();
  const { formOpacity, formTranslateY } = use2FAAnimation();

  // Auto-focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      focusFirstInput();
    }, 300);

    return () => clearTimeout(timer);
  }, [focusFirstInput]);

  // Handlers
  const onVerify = async () => {
    if (!checkCodeComplete(code)) {
      notification.showError('Введите полный код из 6 цифр');
      return;
    }

    const success = await handleVerify(code, email);

    if (!success) {
      clearCode();
      focusFirstInput();
    }
  };

  const handleResendCode = () => {
    setIsResending(true);
    showConfirm(
      'Отправить код повторно',
      'Для повторной отправки кода необходимо вернуться на экран входа',
      () => navigation.goBack(),
      undefined,
      { confirmText: 'Вернуться', cancelText: 'Отмена' }
    );
    setIsResending(false);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isCodeComplete = checkCodeComplete(code);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.formContainer,
              { backgroundColor: theme.card },
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <TwoFactorHeader email={email} />

            <CodeInputGrid
              code={code}
              inputRefs={inputRefs}
              isLoading={isLoading}
              onCodeChange={handleCodeChange}
              onKeyPress={handleKeyPress}
            />

            <TwoFactorActions
              isCodeComplete={isCodeComplete}
              isLoading={isLoading}
              isResending={isResending}
              onVerify={onVerify}
              onResendCode={handleResendCode}
              onBack={handleBack}
            />
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  formContainer: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default TwoFactorScreen;
