/**
 * Two-Factor Authentication Screen
 * Экран для ввода 2FA кода
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import * as authApi from '@api/auth.api';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';
import { useAuthStore } from '@store/authStore';
import { useNotification } from '@contexts/NotificationContext';
import { useActionModal } from '@contexts/ActionModalContext';
import { extractErrorCode, ErrorCode, formatApiError, isSuperAdminWebOnly } from '@utils/errorUtils';
import { ApiError } from '@types/common.types';

type TwoFactorScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'TwoFactor'>;
type TwoFactorScreenRouteProp = RouteProp<AuthStackParamList, 'TwoFactor'>;

const TwoFactorScreen: React.FC = () => {
  const navigation = useNavigation<TwoFactorScreenNavigationProp>();
  const route = useRoute<TwoFactorScreenRouteProp>();
  const { email } = route.params;
  const notification = useNotification();
  const { showConfirm } = useActionModal();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Анимация для карточки формы
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Анимация появления
    Animated.parallel([
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(formTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Автофокус на первый инпут
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
  }, []);

  const handleCodeChange = (text: string, index: number) => {
    // Разрешаем только цифры
    const numericText = text.replace(/[^0-9]/g, '');

    if (numericText.length === 0) {
      // Очистка текущего поля
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);

      // Переход к предыдущему полю при удалении
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    // Если вставили весь код сразу
    if (numericText.length === 6) {
      const newCode = numericText.split('').slice(0, 6);
      setCode(newCode);
      inputRefs.current[5]?.focus();
      return;
    }

    // Обновление кода
    const newCode = [...code];
    newCode[index] = numericText[0];
    setCode(newCode);

    // Автопереход к следующему полю
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // Если это последнее поле, убираем фокус
      inputRefs.current[index]?.blur();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && code[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');

    if (fullCode.length !== 6) {
      notification.showError('Введите полный код из 6 цифр');
      return;
    }

    try {
      setIsLoading(true);
      const response = await authApi.verify2FACode({
        email,
        code: fullCode,
      });

      // Блокируем доступ для super_admin - они должны использовать веб-панель
      if (response.user.role === 'super_admin') {
        notification.showError('Супер-администратор должен использовать веб-панель');
        setIsLoading(false);
        return;
      }

      // Сохраняем сессию
      if (response.session?.session_id) {
        await secureStorage.setItemAsync(
          STORAGE_KEYS.SESSION_ID,
          response.session.session_id
        );
      }

      // Сохраняем данные пользователя
      await secureStorage.setItemAsync(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(response.user)
      );

      // Обновляем стор
      useAuthStore.getState().setUser(response.user);

      // Показываем успешное уведомление
      notification.showSuccess('Успешная авторизация');

      // Навигация произойдет автоматически через AuthNavigator
    } catch (err: any) {
      console.error('2FA verification error:', err);

      // Проверяем error_code если доступен
      const errorCode = extractErrorCode(err);

      if (errorCode) {
        // Обрабатываем специфичные коды ошибок
        if (errorCode === ErrorCode.AUTH_2FA_INVALID_CODE) {
          notification.showError('Неверный код подтверждения');
          // Очистить код при ошибке
          setCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
          return;
        }

        if (errorCode === ErrorCode.AUTH_2FA_CODE_EXPIRED) {
          notification.showError('Код подтверждения истёк. Запросите новый код');
          // Очистить код
          setCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
          return;
        }

        if (isSuperAdminWebOnly(err as ApiError)) {
          notification.showError('Супер-администратор может входить только через веб-панель');
          return;
        }

        // Показываем ошибку через notification
        notification.showApiError(err as ApiError);
      } else {
        // Fallback на старую логику
        notification.showError(err.message || 'Неверный код');
      }

      // Очистить код при любой ошибке
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setIsResending(true);
      // Для повторной отправки нужен пароль, который мы не храним
      // Поэтому предлагаем вернуться на экран логина
      showConfirm(
        'Отправить код повторно',
        'Для повторной отправки кода необходимо вернуться на экран входа',
        () => navigation.goBack(),
        undefined,
        { confirmText: 'Вернуться', cancelText: 'Отмена' }
      );
    } finally {
      setIsResending(false);
    }
  };

  // Проверяем, заполнены ли все поля
  const isCodeComplete = code.every((digit) => digit !== '');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Двухфакторная аутентификация</Text>
              <Text style={styles.subtitle}>
                Мы отправили 6-значный код на
              </Text>
              <Text style={styles.email}>{email}</Text>
            </View>

            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  style={[
                    styles.codeInput,
                    digit !== '' && styles.codeInputFilled,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!isLoading}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                (!isCodeComplete || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleVerify}
              disabled={!isCodeComplete || isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Подтвердить</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Не получили код? </Text>
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={isResending || isLoading}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.resendLink,
                    (isResending || isLoading) && styles.resendLinkDisabled,
                  ]}
                >
                  Отправить повторно
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>Вернуться к входу</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E94444',
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    backgroundColor: '#F9FAFB',
  },
  codeInputFilled: {
    borderColor: '#E94444',
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: '#E94444',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#E94444',
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
    color: '#6B7280',
  },
  resendLink: {
    fontSize: 14,
    color: '#E94444',
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
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default TwoFactorScreen;
