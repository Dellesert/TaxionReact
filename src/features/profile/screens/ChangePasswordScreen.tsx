/**
 * Change Password Screen
 * Экран изменения пароля из профиля
 */

import React, { useState, useRef } from 'react';
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
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { updatePassword } from '@api/user.api';

type NavigationProp = NativeStackNavigationProp<any>;

const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const newPasswordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const handleChangePassword = async () => {
    setError(null);
    Keyboard.dismiss();

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Заполните все поля');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      setError('Новый пароль должен содержать минимум 6 символов');
      return;
    }

    if (newPassword.length > 100) {
      setError('Новый пароль не должен превышать 100 символов');
      return;
    }

    if (currentPassword === newPassword) {
      setError('Новый пароль должен отличаться от текущего');
      return;
    }

    setIsLoading(true);

    try {
      await updatePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });

      showSuccess('Пароль успешно изменён');
      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Не удалось изменить пароль');
      showError(err.message || 'Не удалось изменить пароль');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Изменить пароль</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={[styles.keyboardView, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              Введите текущий пароль и новый пароль для изменения
            </Text>

            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Текущий пароль"
                placeholderTextColor={theme.inputPlaceholder}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoComplete="password"
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => newPasswordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                ref={newPasswordInputRef}
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Новый пароль"
                placeholderTextColor={theme.inputPlaceholder}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoComplete="password-new"
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowNewPassword(!showNewPassword)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                ref={confirmPasswordInputRef}
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Подтвердите новый пароль"
                placeholderTextColor={theme.inputPlaceholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoComplete="password-new"
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleChangePassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordHint}>
              <Text style={[styles.passwordHintText, { color: theme.textSecondary }]}>
                Пароль должен содержать минимум 6 символов (максимум 100)
              </Text>
            </View>

            {error && (
              <View style={[styles.errorContainer, {
                borderLeftColor: theme.error,
              }]}>
                <Text style={styles.errorText}>
                  {error}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: theme.primary },
                isLoading && styles.buttonDisabled
              ]}
              onPress={handleChangePassword}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Изменить пароль</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: Platform.OS === 'web' ? 100 : Platform.OS === 'ios' ? 100 : 24,
  },
  formContainer: {
    width: '100%',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 16,
  },
  passwordInput: {
    paddingRight: 50,
    marginBottom: 0,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  passwordHint: {
    marginBottom: 16,
  },
  passwordHintText: {
    fontSize: 12,
  },
  errorContainer: {
    backgroundColor: '#7F1D1D',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
  },
  button: {
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
});

export default ChangePasswordScreen;
