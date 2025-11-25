/**
 * Reset Password Screen
 * Экран сброса пароля по токену из email
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { useActionModal } from '@contexts/ActionModalContext';
import { useTheme } from '@hooks/useTheme';
import { useTokenValidation } from '../hooks/useTokenValidation';
import { useResetPasswordAction } from '../hooks/useResetPasswordAction';
import { ResetPasswordHeader } from '../components/ResetPasswordHeader';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { TokenValidationStates } from '../components/TokenValidationStates';

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useRoute<ResetPasswordScreenRouteProp>();
  const { showModal, hideModal } = useActionModal();
  const { theme } = useTheme();

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
});

export default ResetPasswordScreen;
