/**
 * Reset Password Screen
 * Экран сброса пароля по токену из email
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useTokenValidation } from '../hooks/useTokenValidation';
import { useResetPasswordAction } from '../hooks/useResetPasswordAction';
import { ResetPasswordHeader } from '../components/forgot-password/ResetPasswordHeader';
import { ResetPasswordForm } from '../components/forgot-password/ResetPasswordForm';
import { TokenValidationStates } from '../components/common/TokenValidationStates';

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useRoute<ResetPasswordScreenRouteProp>();
  const { showModal, hideModal } = useActionModal();
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();

  const token = route.params?.token;

  // State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle invalid token
  const handleInvalidToken = (errorMessage: string) => {
    showModal({
      title: token ? 'Недействительная ссылка' : 'Ошибка',
      message: token ? errorMessage : 'Токен не найден',
      actions: [
        {
          text: token ? 'Вернуться к входу' : 'OK',
          onPress: () => {
            hideModal();
            navigation.navigate('Login');
          },
          style: 'primary',
        },
      ],
    });
  };

  // Token validation
  const { isValidating, isValid, email, expiresAt } = useTokenValidation(token, handleInvalidToken);

  // Handle successful reset
  const handleSuccess = () => {
    showModal({
      title: 'Успешно',
      message: 'Пароль успешно изменён. Теперь вы можете войти с новым паролем.',
      actions: [
        {
          text: 'Войти',
          onPress: () => {
            hideModal();
            navigation.navigate('Login');
          },
          style: 'primary',
        },
      ],
    });
  };

  // Password reset action
  const { isLoading, error, handleReset } = useResetPasswordAction(handleSuccess);

  // Handlers
  const handleSubmit = () => {
    if (token) {
      handleReset(token, password, confirmPassword);
    }
  };

  const handleCancel = () => {
    navigation.navigate('Login');
  };

  // Show validation states
  if (isValidating || !isValid) {
    return (
      <TokenValidationStates isValidating={isValidating} isValid={isValid} onBackToLogin={handleCancel} />
    );
  }

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
          <ResetPasswordHeader email={email} expiresAt={expiresAt} />

          <ResetPasswordForm
            password={password}
            confirmPassword={confirmPassword}
            error={error}
            isLoading={isLoading}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
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
          <ResetPasswordHeader email={email} expiresAt={expiresAt} />

          <ResetPasswordForm
            password={password}
            confirmPassword={confirmPassword}
            error={error}
            isLoading={isLoading}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
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

export default ResetPasswordScreen;
