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

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login, isLoading, error } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
  }, []);

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

  const handleRegister = () => {
    console.log('Register button clicked!');
    navigation.navigate('Register');
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

              <TouchableOpacity style={styles.forgotPassword}>
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
                  <Text style={styles.buttonText}>Вход</Text>
                )}
              </TouchableOpacity>

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Нет аккаунта? </Text>
                <TouchableOpacity onPress={handleRegister} disabled={isLoading} activeOpacity={0.7}>
                  <Text style={styles.registerLink}>Зарегистрируйся</Text>
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
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#6B7280',
  },
  button: {
    backgroundColor: '#E94444',
    borderRadius: 12,
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
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  registerLink: {
    fontSize: 14,
    color: '#E94444',
    fontWeight: '600',
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
});

export default LoginScreen;
