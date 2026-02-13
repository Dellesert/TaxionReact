/**
 * Login Screen
 * Экран входа в систему
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { useAuth } from '@shared/hooks/useAuth';
import { useLoginForm } from '../hooks/useLoginForm';
import { usePasskeyAuth } from '../hooks/usePasskeyAuth';
import { usePasswordAuth } from '../hooks/usePasswordAuth';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { LoginLogo } from '../components/login/LoginLogo';
import { LoginForm } from '../components/login/LoginForm';
import { AlternativeLoginMethods } from '../components/login/AlternativeLoginMethods';
import { SavedAccountsList } from '../components/login/SavedAccountsList';
import { useAccountStore } from '@shared/store/accountStore';
import type { ApiError } from '../../../types/common.types';
import type { SavedAccount } from '@/types/account.types';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { isLoading } = useAuth();
  const notification = useNotification();
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();
  const { savedAccounts, isSwitching, quickSwitch } = useAccountStore();

  // Handlers for saved accounts
  const handleQuickSwitch = (account: SavedAccount) => {
    quickSwitch(account.userId);
  };

  const handleSelectAccount = (account: SavedAccount) => {
    setEmail(account.email);
  };

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
          {/* Left side - Logo */}
          <View style={[styles.desktopLogoSection, { backgroundColor: theme.primary }]}>
            <LoginLogo opacity={logoOpacity} />
          </View>

          {/* Right side - Form */}
          <ScrollView
            style={styles.desktopFormSection}
            contentContainerStyle={styles.desktopFormContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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

            <AlternativeLoginMethods
              passkeySupported={passkeySupported}
              isPasskeyLoading={isPasskeyLoading}
              isLoading={isLoading}
              onPasskeyLogin={handlePasskeyLogin}
              onAcceptInvitation={handleAcceptInvitation}
            />

            <SavedAccountsList
              accounts={savedAccounts}
              isSwitching={isSwitching}
              onQuickSwitch={handleQuickSwitch}
              onSelectAccount={handleSelectAccount}
            />
          </ScrollView>
        </View>
      </View>
    );
  }

  // Mobile layout
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

            <SavedAccountsList
              accounts={savedAccounts}
              isSwitching={isSwitching}
              onQuickSwitch={handleQuickSwitch}
              onSelectAccount={handleSelectAccount}
            />
          </Animated.View>
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
  },
  formSection: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    minHeight: 400,
  },
  // Desktop styles
  desktopContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  desktopCard: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 1000,
    height: 600,
    borderRadius: 24,
    overflow: 'hidden',
  },
  desktopLogoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 400,
  },
  desktopFormSection: {
    flex: 1,
    minWidth: 400,
  },
  desktopFormContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 60,
    paddingVertical: 40,
  },
});

export default LoginScreen;
