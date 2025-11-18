/**
 * Forgot Password Screen
 * Экран запроса сброса пароля
 */

import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { requestPasswordReset } from '@api/password-reset.api';
import { useActionModal } from '@contexts/ActionModalContext';
import { useTheme } from '@hooks/useTheme';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { showModal, hideModal } = useActionModal();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showManualCodeInput, setShowManualCodeInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!email) {
      setError('Введите email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Введите корректный email');
      return;
    }

    setIsLoading(true);

    try {
      await requestPasswordReset({ email });

      setSuccess(true);

      showModal({
        title: 'Запрос отправлен',
        message: 'Если учётная запись с таким email существует, вы получите письмо с инструкциями для сброса пароля.',
        actions: [
          {
            text: 'OK',
            onPress: () => {
              hideModal();
              navigation.navigate('Login');
            },
            style: 'primary'
          }
        ]
      });
    } catch (err: any) {
      setError(err.message || 'Не удалось отправить запрос');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualCodeSubmit = () => {
    setError(null);

    if (!manualCode.trim()) {
      setError('Введите код восстановления');
      return;
    }

    try {
      // Переход на экран сброса пароля с токеном
      navigation.navigate('ResetPassword', { token: manualCode.trim() });
    } catch (err: any) {
      setError(err.message || 'Не удалось перейти к сбросу пароля');
    }
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
      lineHeight: 24,
    },
    formContainer: {
      width: '100%',
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
    errorContainer: {
      backgroundColor: theme.isDark ? '#7F1D1D' : '#FEE2E2',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.error,
    },
    errorText: {
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
    backButton: {
      marginTop: 16,
      alignItems: 'center',
      padding: 12,
    },
    backButtonText: {
      color: theme.textSecondary,
      fontSize: 16,
    },
    successContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    successIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    successIconText: {
      fontSize: 40,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
    },
    successMessage: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 32,
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      marginHorizontal: 16,
      color: theme.textSecondary,
      fontSize: 14,
    },
    linkButton: {
      alignItems: 'center',
      padding: 12,
    },
    linkButtonText: {
      color: theme.primary,
      fontSize: 16,
      fontWeight: '600',
    },
  });

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
            <Text style={styles.title}>Забыли пароль?</Text>
            <Text style={styles.subtitle}>
              Введите ваш email, и мы отправим вам инструкции для сброса пароля
            </Text>
          </View>

          {!success ? (
            <View style={styles.formContainer}>
              {!showManualCodeInput ? (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={theme.inputPlaceholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!isLoading}
                  />

                  {error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                    activeOpacity={0.8}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.buttonText}>Отправить инструкции</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>или</Text>
                    <View style={styles.divider} />
                  </View>

                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => {
                      setShowManualCodeInput(true);
                      setError(null);
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.linkButtonText}>У меня уже есть код</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Введите код восстановления"
                    placeholderTextColor={theme.inputPlaceholder}
                    value={manualCode}
                    onChangeText={setManualCode}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleManualCodeSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>Продолжить</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => {
                      setShowManualCodeInput(false);
                      setManualCode('');
                      setError(null);
                    }}
                  >
                    <Text style={styles.linkButtonText}>Отправить код на email</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.navigate('Login')}
                disabled={isLoading}
              >
                <Text style={styles.backButtonText}>Вернуться к входу</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Text style={styles.successIconText}>✉️</Text>
              </View>
              <Text style={styles.successTitle}>Проверьте почту!</Text>
              <Text style={styles.successMessage}>
                Если учётная запись с таким email существует, вы получите письмо с инструкциями для сброса пароля.
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={styles.buttonText}>Вернуться к входу</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ForgotPasswordScreen;
