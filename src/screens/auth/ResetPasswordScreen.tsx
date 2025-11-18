/**
 * Reset Password Screen
 * Экран сброса пароля по токену из email
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { validateResetToken, resetPassword } from '@api/password-reset.api';
import { useActionModal } from '@contexts/ActionModalContext';
import { useTheme } from '@hooks/useTheme';

type ResetPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useRoute<ResetPasswordScreenRouteProp>();
  const { showModal, hideModal } = useActionModal();
  const { theme } = useTheme();

  const token = route.params?.token;

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [email, setEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      showModal({
        title: 'Ошибка',
        message: 'Токен не найден',
        actions: [
          {
            text: 'OK',
            onPress: () => {
              hideModal();
              navigation.navigate('Login');
            },
            style: 'primary'
          },
        ]
      });
      return;
    }

    const validateToken = async () => {
      try {
        const response = await validateResetToken(token);
        setIsValid(response.valid);
        setEmail(response.email);
        setExpiresAt(response.expires_at);
      } catch (err: any) {
        showModal({
          title: 'Недействительная ссылка',
          message: err.message || 'Токен сброса пароля недействителен или истёк',
          actions: [
            {
              text: 'Вернуться к входу',
              onPress: () => {
                hideModal();
                navigation.navigate('Login');
              },
              style: 'primary'
            }
          ]
        });
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleResetPassword = async () => {
    setError(null);

    // Validation
    if (!password || !confirmPassword) {
      setError('Заполните все поля');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token!, {
        password,
        confirm_password: confirmPassword,
      });

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
            style: 'primary'
          }
        ]
      });
    } catch (err: any) {
      setError(err.message || 'Не удалось сбросить пароль');
    } finally {
      setIsLoading(false);
    }
  };

  const formatExpiryTime = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 24,
      justifyContent: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorIcon: {
      fontSize: 64,
      marginBottom: 16,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    errorMessage: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    formContainer: {
      width: '100%',
    },
    infoBox: {
      backgroundColor: theme.isDark ? '#1E3A5F' : '#DBEAFE',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.isDark ? '#60A5FA' : '#3B82F6',
    },
    infoText: {
      fontSize: 14,
      color: theme.isDark ? '#93C5FD' : '#1E40AF',
    },
    input: {
      backgroundColor: theme.card,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.text,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    passwordHint: {
      marginBottom: 16,
    },
    passwordHintText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    errorBanner: {
      backgroundColor: theme.isDark ? '#7F1D1D' : '#FEE2E2',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.error,
    },
    errorBannerText: {
      color: theme.isDark ? '#FCA5A5' : '#DC2626',
      fontSize: 14,
    },
    button: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    },
    cancelButton: {
      marginTop: 16,
      alignItems: 'center',
      padding: 12,
    },
    cancelButtonText: {
      color: theme.textSecondary,
      fontSize: 16,
    },
  });

  if (isValidating) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Проверка токена...</Text>
        </View>
      </View>
    );
  }

  if (!isValid) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Недействительная ссылка</Text>
          <Text style={styles.errorMessage}>
            Ссылка для сброса пароля недействительна или истекла.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Вернуться к входу</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Сброс пароля</Text>
            <Text style={styles.subtitle}>
              Установите новый пароль для {email}
            </Text>
          </View>

          <View style={styles.formContainer}>
            {expiresAt && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  Ссылка действительна до: {formatExpiryTime(expiresAt)}
                </Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Новый пароль"
              placeholderTextColor={theme.inputPlaceholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Подтвердите пароль"
              placeholderTextColor={theme.inputPlaceholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="password-new"
              editable={!isLoading}
            />

            <View style={styles.passwordHint}>
              <Text style={styles.passwordHintText}>
                Пароль должен содержать минимум 8 символов
              </Text>
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Установить новый пароль</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ResetPasswordScreen;
