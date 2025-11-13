/**
 * Login Screen
 * Экран входа в систему
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { useAuth } from '@hooks/useAuth';
import { isPasskeySupported, authenticateWithPasskey, formatPasskeyError } from '@utils/passkeyUtils';
import { useNotification } from '@contexts/NotificationContext';
import {
  extractErrorCode,
  ErrorCode,
  isSuperAdminWebOnly,
} from '@utils/errorUtils';
import type { ApiError } from '../../types/common.types';
import { useTheme } from '@hooks/useTheme';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login, isLoading, setUser } = useAuth();
  const notification = useNotification();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);

  // Анимация для логотипа (fade in)
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Анимация для карточки формы (slide up from bottom)
  const formTranslateY = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    // Сначала показываем логотип
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Через 1 секунду выезжает карточка снизу
    setTimeout(() => {
      Animated.spring(formTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, 1000);

    // Проверяем поддержку passkey
    checkPasskeySupport();
  }, []);

  const checkPasskeySupport = async () => {
    try {
      const supported = await isPasskeySupported();
      setPasskeySupported(supported);
      console.log('Passkey supported:', supported);
    } catch (error) {
      console.error('Error checking passkey support:', error);
      setPasskeySupported(false);
    }
  };

  const handlePasskeyLogin = async () => {
    console.log('👆 Passkey button clicked!');
    console.log('🔒 isPasskeyLoading:', isPasskeyLoading);
    console.log('🔒 isLoading:', isLoading);

    // No email required for discoverable passkey login!

    setIsPasskeyLoading(true);
    try {
      console.log('🔐 Starting discoverable passkey login (no email required)');

      const authApi = await import('@api/auth.api');

      // 1. Начинаем процесс входа - получаем challenge от сервера (БЕЗ email!)
      const beginResponse = await authApi.beginDiscoverablePasskeyLogin();
      console.log('✅ Got passkey challenge:', beginResponse);

      // 2. Показываем системный диалог для аутентификации (кросс-платформенно)
      // Браузер/устройство покажет доступные passkeys
      const credential = await authenticateWithPasskey(
        beginResponse.publicKey.challenge,
        { publicKey: beginResponse.publicKey }
      );
      console.log('✅ Got credential from device:', credential);

      // 3. Отправляем credential на сервер для верификации
      const loginResponse = await authApi.finishPasskeyLogin(credential);
      console.log('✅ Passkey login successful:', loginResponse);

      // 4. Блокируем доступ для super_admin
      if (loginResponse.user.role === 'super_admin') {
        console.log('🚫 Super admin access blocked - use web dashboard instead');
        Alert.alert('Ошибка', 'Super admin доступ ограничен веб-панелью. Используйте админ-панель.');
        return;
      }

      // 5. Сохраняем сессию в storage
      const secureStorage = await import('@utils/secureStorage');
      const { STORAGE_KEYS } = await import('@constants/app.constants');

      if (loginResponse.session?.session_id) {
        console.log('💾 Saving session ID to storage...');
        await secureStorage.setItemAsync(
          STORAGE_KEYS.SESSION_ID,
          loginResponse.session.session_id
        );
      }

      // Сохраняем данные пользователя
      await secureStorage.setItemAsync(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(loginResponse.user)
      );

      console.log('✅ Session data saved successfully!');

      // 6. Обновляем состояние авторизации
      setUser(loginResponse.user);

    } catch (error: any) {
      console.error('❌ Passkey login error:', error);

      // Проверяем если это ApiError с error_code
      if (error && typeof error === 'object' && 'error_code' in error) {
        const apiError = error as ApiError;

        // Обрабатываем специальные случаи
        if (isSuperAdminWebOnly(apiError)) {
          notification.showError('Супер-администратор может входить только через веб-панель');
          return;
        }

        // Показываем ошибку через notification
        notification.showApiError(apiError);
      } else {
        // Fallback для других ошибок
        const errorMessage = formatPasskeyError(error);
        notification.showError(errorMessage);
      }
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleLogin = async () => {
    console.log('Login button clicked!', { email, password });

    if (!email || !password) {
      notification.showError('Заполните все поля');
      return;
    }

    try {
      console.log('Calling login...');

      // Используем send2FACode чтобы проверить нужна ли 2FA
      // Если у пользователя включена 2FA, код будет отправлен
      // Если нет - получим ошибку и сделаем обычный логин
      const authApi = await import('@api/auth.api');

      try {
        const response = await authApi.send2FACode({ email, password });
        // Если успешно - значит 2FA включена, переходим на экран ввода кода
        console.log('✅ 2FA code sent successfully:', response);
        console.log('📧 Navigating to TwoFactor screen for email:', email);
        notification.showSuccess('Код подтверждения отправлен на ваш email');
        navigation.navigate('TwoFactor', { email });
        return; // ВАЖНО: Останавливаем выполнение, не продолжаем логин
      } catch (twoFAError: any) {
        console.log('⚠️ 2FA error (expected if 2FA not enabled):', twoFAError);

        // Проверяем error_code если доступен
        const errorCode = extractErrorCode(twoFAError);

        // Если это ApiError с error_code
        if (errorCode) {
          // Обрабатываем специальные коды ошибок
          if (errorCode === ErrorCode.AUTH_2FA_REQUIRED) {
            console.log('🔐 2FA is required, navigating to TwoFactor screen...');
            // Код уже отправлен или отправим снова
            try {
              await authApi.send2FACode({ email, password });
              notification.showInfo('Код подтверждения отправлен на ваш email');
            } catch (sendError) {
              console.log('⚠️ Error sending code:', sendError);
            }
            navigation.navigate('TwoFactor', { email });
            return;
          }

          if (errorCode === ErrorCode.AUTH_SUPER_ADMIN_WEB_ONLY) {
            console.log('🚫 Super admin access blocked');
            notification.showError('Супер-администратор может входить только через веб-панель');
            return;
          }

          if (errorCode === ErrorCode.AUTH_PASSKEY_ONLY) {
            console.log('🔑 Passkey only for this account');
            notification.showError('Для этого аккаунта доступен только вход через Passkey');
            return;
          }

          if (errorCode === ErrorCode.AUTH_ACCOUNT_DEACTIVATED) {
            notification.showApiError(twoFAError);
            return;
          }

          if (errorCode === ErrorCode.AUTH_INVALID_CREDENTIALS) {
            notification.showApiError(twoFAError);
            return;
          }

          // Если это ошибка "2FA not enabled" - делаем обычный логин
          if (errorCode === ErrorCode.AUTH_2FA_NOT_ENABLED) {
            console.log('🔓 2FA not enabled for this user, doing regular login...');
            await login({ email, password });
            console.log('✅ Regular login successful!');
            return;
          }

          // Для других error_code показываем через notification
          notification.showApiError(twoFAError);
          return;
        }

        // Fallback: если нет error_code, используем старую логику
        const errorMessage = (twoFAError?.message?.toLowerCase() || '') + ' ' + (twoFAError?.details?.error?.toLowerCase() || '');

        // Проверяем на блокировку super admin (403 Forbidden)
        if (twoFAError?.status === 403 && (errorMessage.includes('super admin') || errorMessage.includes('restricted to web'))) {
          console.log('🚫 Super admin access blocked');
          notification.showError('Супер-администратор может входить только через веб-панель');
          return;
        }

        // Проверяем если это ошибка "2FA is required"
        if (twoFAError?.status === 403 && errorMessage.includes('2fa is required')) {
          console.log('🔐 2FA is globally required, navigating to TwoFactor screen...');
          try {
            await authApi.send2FACode({ email, password });
          } catch (sendError) {
            console.log('⚠️ Code already sent or error sending:', sendError);
          }
          navigation.navigate('TwoFactor', { email });
          return;
        }

        // Проверяем что это именно ошибка "2FA not enabled"
        const is2FANotEnabled =
          twoFAError?.status === 400 ||
          errorMessage.includes('two factor') ||
          errorMessage.includes('2fa') ||
          errorMessage.includes('not enabled');

        if (is2FANotEnabled) {
          console.log('🔓 2FA not enabled for this user, doing regular login...');
          await login({ email, password });
          console.log('✅ Regular login successful!');
        } else {
          // Это другая ошибка - показываем через notification
          console.error('❌ Unexpected error:', twoFAError);
          notification.showApiError(twoFAError);
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      // Показываем ошибку через notification вместо Alert
      if (err && typeof err === 'object' && 'error_code' in err) {
        notification.showApiError(err as ApiError);
      } else {
        notification.showError(err.message || 'Не удалось войти в систему');
      }
    }
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
          <Animated.View style={[styles.logoSection, { opacity: logoOpacity }]}>
            <View>
              <Image
                source={require('../../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Тахион</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View
            style={[
              styles.formSection,
              {
                backgroundColor: theme.background,
                transform: [{ translateY: formTranslateY }],
              }
            ]}
          >
            <View style={styles.formContainer}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Email"
                placeholderTextColor={theme.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Пароль"
                placeholderTextColor={theme.inputPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                editable={!isLoading}
              />

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={[styles.forgotPasswordText, { color: theme.textSecondary }]}>
                  Забыли пароль?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.primary }, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Войти</Text>
                )}
              </TouchableOpacity>

              {/* Alternative login methods - compact links */}
              <View style={styles.altMethodsContainer}>
                {passkeySupported && (
                  <TouchableOpacity
                    style={styles.altMethodLink}
                    onPress={handlePasskeyLogin}
                    disabled={isPasskeyLoading || isLoading}
                    activeOpacity={0.7}
                  >
                    {isPasskeyLoading ? (
                      <ActivityIndicator color={theme.primary} size="small" />
                    ) : (
                      <Text style={[styles.altMethodText, { color: theme.textSecondary }]}>
                        🔑 Быстрый вход
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.altMethodLink}
                  onPress={() => navigation.navigate('AcceptInvitation', {})}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.altMethodText, { color: theme.textSecondary }]}>
                    ✉️ Есть риглашение?
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  title: {
    fontSize: 32,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  formSection: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
    minHeight: 400,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 32,
    marginTop: -8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  altMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 24,
  },
  altMethodLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  altMethodText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default LoginScreen;
