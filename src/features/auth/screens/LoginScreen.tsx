/**
 * Login Screen
 * Экран входа в систему
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { useAuth } from '@hooks/useAuth';
import { useLoginForm } from '../hooks/useLoginForm';
import { usePasskeyAuth } from '../hooks/usePasskeyAuth';
import { usePasswordAuth } from '../hooks/usePasswordAuth';
import { useNotification } from '@contexts/NotificationContext';
import { useTheme } from '@hooks/useTheme';
import { LoginLogo } from '../components/LoginLogo';
import { LoginForm } from '../components/LoginForm';
import { AlternativeLoginMethods } from '../components/AlternativeLoginMethods';
import type { ApiError } from '../../../types/common.types';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { isLoading } = useAuth();
  const notification = useNotification();
  const { theme } = useTheme();

  // Form state
  const {
    email,
    password,
    showPassword,
    passwordInputRef,
    setEmail,
    setPassword,
    togglePasswordVisibility,
  } = useLoginForm();

  // Animation refs
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(600)).current;

  // Error handler
  const handleError = (error: ApiError | string) => {
    if (typeof error === 'string') {
      notification.showError(error);
    } else {
      notification.showApiError(error);
    }
  };

  // Passkey auth
  const { isPasskeyLoading, passkeySupported, handlePasskeyLogin } = usePasskeyAuth(handleError);

  // Password auth
  const { handlePasswordLogin } = usePasswordAuth();

  // Initialize animations
  useEffect(() => {
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.spring(formTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 1000);
  }, []);

  // Handlers
  const handleLogin = () => {
    handlePasswordLogin(
      email,
      password,
      (email: string) => navigation.navigate('TwoFactor', { email }),
      handleError,
      (message: string) => notification.showSuccess(message)
    );
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleAcceptInvitation = () => {
    navigation.navigate('AcceptInvitation', {});
  };

  const handlePasswordInputFocus = () => {
    passwordInputRef.current?.focus();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.primary }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Logo Section */}
          <LoginLogo opacity={logoOpacity} />

          {/* Form Section */}
          <Animated.View
            style={[
              styles.formSection,
              {
                backgroundColor: theme.background,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <LoginForm
              email={email}
              password={password}
              showPassword={showPassword}
              isLoading={isLoading}
              passwordInputRef={passwordInputRef}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onTogglePassword={togglePasswordVisibility}
              onSubmit={handleLogin}
              onForgotPassword={handleForgotPassword}
              onPasswordInputFocus={handlePasswordInputFocus}
            />

            {/* Alternative login methods */}
            <AlternativeLoginMethods
              passkeySupported={passkeySupported}
              isPasskeyLoading={isPasskeyLoading}
              isLoading={isLoading}
              onPasskeyLogin={handlePasskeyLogin}
              onAcceptInvitation={handleAcceptInvitation}
            />
          </Animated.View>
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
  },
  formSection: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    minHeight: 400,
  },
});

export default LoginScreen;
