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

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login, isLoading, error, setUser } = useAuth();

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
    console.log('📧 Email:', email);
    console.log('🔒 isPasskeyLoading:', isPasskeyLoading);
    console.log('🔒 isLoading:', isLoading);

    if (!email) {
      Alert.alert('Ошибка', 'Введите email для входа с помощью Passkey');
      return;
    }

    setIsPasskeyLoading(true);
    try {
      console.log('🔐 Starting passkey login for:', email);

      const authApi = await import('@api/auth.api');

      // 1. Начинаем процесс входа - получаем challenge от сервера
      const beginResponse = await authApi.beginPasskeyLogin({ email });
      console.log('✅ Got passkey challenge:', beginResponse);

      // 2. Показываем системный диалог для аутентификации (кросс-платформенно)
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

      Alert.alert('Успех', 'Вход выполнен успешно!');
    } catch (error: any) {
      console.error('❌ Passkey login error:', error);
      const errorMessage = formatPasskeyError(error);
      Alert.alert('Ошибка входа', errorMessage);
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleLogin = async () => {
    console.log('Login button clicked!', { email, password });

    if (!email || !password) {
      Alert.alert('Ошибка', 'Заполните все поля');
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
        navigation.navigate('TwoFactor', { email });
        return; // ВАЖНО: Останавливаем выполнение, не продолжаем логин
      } catch (twoFAError: any) {
        // Если ошибка - значит 2FA не включена, делаем обычный логин
        console.log('⚠️ 2FA error (expected if 2FA not enabled):', {
          message: twoFAError?.message,
          status: twoFAError?.status,
          responseData: twoFAError?.details?.error,
        });

        const errorMessage = (twoFAError?.message?.toLowerCase() || '') + ' ' + (twoFAError?.details?.error?.toLowerCase() || '');

        // Проверяем если это ошибка "2FA is required" - переходим на экран ввода кода
        if (twoFAError?.status === 403 && errorMessage.includes('2fa is required')) {
          console.log('🔐 2FA is globally required, navigating to TwoFactor screen...');
          // Сначала отправляем код
          try {
            await authApi.send2FACode({ email, password });
          } catch (sendError) {
            console.log('⚠️ Code already sent or error sending:', sendError);
          }
          navigation.navigate('TwoFactor', { email });
          return;
        }

        // Проверяем на блокировку super admin (403 Forbidden)
        if (twoFAError?.status === 403 && (errorMessage.includes('super admin') || errorMessage.includes('restricted to web'))) {
          console.log('🚫 Super admin access blocked');
          throw new Error('Super admin должен использовать веб-панель администратора');
        }

        // Проверяем что это именно ошибка "2FA not enabled"
        // Либо по тексту ошибки, либо по статус коду 400
        const is2FANotEnabled =
          twoFAError?.status === 400 ||
          errorMessage.includes('two factor') ||
          errorMessage.includes('2fa') ||
          errorMessage.includes('not enabled');

        if (is2FANotEnabled) {
          console.log('🔓 2FA not enabled for this user, doing regular login...');
          // Пробуем обычный логин
          await login({ email, password });
          console.log('✅ Regular login successful!');
        } else {
          // Это другая ошибка (например, неправильный пароль)
          console.error('❌ Not a 2FA error, throwing:', twoFAError);
          throw twoFAError;
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      Alert.alert('Ошибка входа', err.message || 'Не удалось войти в систему');
    }
  };

  return (
    <View style={styles.container}>
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
                transform: [{ translateY: formTranslateY }],
              }
            ]}
          >
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />

              <TextInput
                style={styles.input}
                placeholder="Пароль"
                placeholderTextColor="#9CA3AF"
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
                <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
              </TouchableOpacity>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
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
                      <ActivityIndicator color="#6366F1" size="small" />
                    ) : (
                      <Text style={styles.altMethodText}>
                        🔑 Passkey
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
                  <Text style={styles.altMethodText}>
                    ✉️ Приглашение
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
    backgroundColor: '#E94444',
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
  
  logoText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#E94444',
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
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
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
    color: '#6B7280',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#E94444',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#E94444',
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
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
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
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default LoginScreen;
