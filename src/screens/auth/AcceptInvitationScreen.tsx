/**
 * Accept Invitation Screen
 * Экран активации приглашения по коду
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import * as invitationApi from '@api/invitation.api';
import { useNotification } from '@contexts/NotificationContext';

type AcceptInvitationScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'AcceptInvitation'>;
type AcceptInvitationScreenRouteProp = RouteProp<AuthStackParamList, 'AcceptInvitation'>;

const AcceptInvitationScreen: React.FC = () => {
  const navigation = useNavigation<AcceptInvitationScreenNavigationProp>();
  const route = useRoute<AcceptInvitationScreenRouteProp>();
  const { showError } = useNotification();

  // Получаем токен из параметров (если пришли по deep link)
  const initialToken = route.params?.token || '';

  const [step, setStep] = useState<'enter_code' | 'create_password' | 'success'>('enter_code');
  const [invitationCode, setInvitationCode] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);

  // Анимация
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Если токен уже есть (пришли по deep link), сразу валидируем
    if (initialToken) {
      handleValidateCode();
    }
  }, []);

  const handleValidateCode = async () => {
    if (!invitationCode.trim()) {
      showError('Введите код приглашения');
      return;
    }

    setIsLoading(true);

    try {
      const data = await invitationApi.validateInvitation(invitationCode.trim());

      if (!data || !data.is_valid) {
        showError('Приглашение недействительно или истекло');
        setIsLoading(false);
        return;
      }

      setInvitationData(data);
      setStep('create_password');
    } catch (error: any) {
      console.error('Validation error:', error);
      showError(
        error?.message || error?.response?.data?.error || 'Не удалось проверить код приглашения'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!password || !confirmPassword) {
      showError('Заполните все поля');
      return;
    }

    if (password.length < 8) {
      showError('Пароль должен содержать минимум 8 символов');
      return;
    }

    if (password !== confirmPassword) {
      showError('Пароли не совпадают');
      return;
    }

    setIsLoading(true);

    try {
      await invitationApi.acceptInvitation(invitationCode.trim(), {
        password,
        confirm_password: confirmPassword,
      });

      setIsLoading(false);

      // Show success screen
      setStep('success');

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigation.navigate('Login');
      }, 3000);
    } catch (error: any) {
      console.error('Accept invitation error:', error);

      let errorMessage = 'Не удалось активировать приглашение';

      // Extract error message from response
      if (error?.details?.error) {
        const serverError = error.details.error.toLowerCase();

        if (serverError.includes('already') || serverError.includes('accepted')) {
          errorMessage = 'Это приглашение уже было активировано. Используйте свой email и пароль для входа.';
        } else if (serverError.includes('expired')) {
          errorMessage = 'Срок действия приглашения истёк. Обратитесь к администратору.';
        } else {
          errorMessage = error.details.error;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }

      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Супер Админ';
      case 'admin': return 'Админ';
      case 'department_head': return 'Руководитель отдела';
      case 'employee': return 'Сотрудник';
      default: return role;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Заголовок */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>✉️</Text>
            <Text style={styles.title}>Приглашение в Tachyon</Text>
            <Text style={styles.subtitle}>
              {step === 'enter_code'
                ? 'Введите код из письма'
                : step === 'create_password'
                ? 'Создайте пароль для входа'
                : 'Аккаунт успешно активирован!'}
            </Text>
          </View>

          {step === 'success' ? (
            // Success Screen
            <View style={styles.form}>
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Успешно!</Text>
                <Text style={styles.successMessage}>
                  Ваш аккаунт активирован. Сейчас вы будете перенаправлены на страницу входа.
                </Text>
                <ActivityIndicator color="#E94444" style={{ marginTop: 20 }} />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.buttonText}>Перейти к входу</Text>
              </TouchableOpacity>
            </View>
          ) : step === 'enter_code' ? (
            // Шаг 1: Ввод кода приглашения
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Код приглашения</Text>
                <TextInput
                  style={styles.input}
                  value={invitationCode}
                  onChangeText={setInvitationCode}
                  placeholder="Введите код из письма"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <Text style={styles.hint}>
                  Код находится в письме-приглашении
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleValidateCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Продолжить</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.linkText}>Уже есть аккаунт? Войти</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Шаг 2: Создание пароля
            <View style={styles.form}>
              {/* Информация о приглашении */}
              {invitationData && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>Информация о приглашении</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Имя:</Text>
                    <Text style={styles.infoValue}>{invitationData.name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{invitationData.email}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Роль:</Text>
                    <Text style={styles.infoValue}>
                      {getRoleLabel(invitationData.role)}
                    </Text>
                  </View>
                  {invitationData.department && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Отдел:</Text>
                      <Text style={styles.infoValue}>
                        {invitationData.department.name}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Поля для создания пароля */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Создайте пароль</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Минимум 8 символов"
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Подтвердите пароль</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Повторите пароль"
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleAcceptInvitation}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Активировать аккаунт</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => {
                  setStep('enter_code');
                  setPassword('');
                  setConfirmPassword('');
                  setInvitationData(null);
                }}
              >
                <Text style={styles.linkText}>← Назад</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: '#E94444',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#E94444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#E94444',
    fontSize: 14,
    fontWeight: '600',
  },
  successBox: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default AcceptInvitationScreen;
