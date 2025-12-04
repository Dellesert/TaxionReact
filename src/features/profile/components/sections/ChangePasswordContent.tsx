/**
 * Change Password Content
 * Контент для изменения пароля (без navigation header)
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { updatePassword } from '@api/user.api';

const ChangePasswordContent: React.FC = () => {
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

      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Не удалось изменить пароль');
      showError(err.message || 'Не удалось изменить пароль');
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
      marginBottom: 8,
      marginTop: 16,
    },
    inputContainer: {
      position: 'relative',
    },
    input: {
      borderRadius: 12,
      padding: 16,
      paddingRight: 50,
      fontSize: 16,
      borderWidth: 1,
      backgroundColor: theme.card,
      color: theme.text,
      borderColor: theme.border,
    },
    eyeButton: {
      position: 'absolute',
      right: 12,
      top: 12,
      padding: 8,
    },
    hint: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 6,
      lineHeight: 18,
    },
    errorContainer: {
      backgroundColor: '#7F1D1D',
      padding: 12,
      borderRadius: 8,
      marginTop: 16,
      borderLeftWidth: 4,
      borderLeftColor: theme.error,
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
      marginTop: 32,
      backgroundColor: theme.primary,
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

  return (
    <View>
      <Text style={dynamicStyles.label}>Текущий пароль</Text>
      <View style={dynamicStyles.inputContainer}>
        <TextInput
          style={dynamicStyles.input}
          placeholder="Введите текущий пароль"
          placeholderTextColor={theme.inputPlaceholder}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry={!showCurrentPassword}
          autoCapitalize="none"
          editable={!isLoading}
          returnKeyType="next"
          onSubmitEditing={() => newPasswordInputRef.current?.focus()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={dynamicStyles.eyeButton}
          onPress={() => setShowCurrentPassword(!showCurrentPassword)}
        >
          <Ionicons
            name={showCurrentPassword ? 'eye-off' : 'eye'}
            size={22}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <Text style={dynamicStyles.label}>Новый пароль</Text>
      <View style={dynamicStyles.inputContainer}>
        <TextInput
          ref={newPasswordInputRef}
          style={dynamicStyles.input}
          placeholder="Введите новый пароль"
          placeholderTextColor={theme.inputPlaceholder}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNewPassword}
          autoCapitalize="none"
          editable={!isLoading}
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={dynamicStyles.eyeButton}
          onPress={() => setShowNewPassword(!showNewPassword)}
        >
          <Ionicons
            name={showNewPassword ? 'eye-off' : 'eye'}
            size={22}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>
      <Text style={dynamicStyles.hint}>Минимум 6 символов</Text>

      <Text style={dynamicStyles.label}>Подтверждение нового пароля</Text>
      <View style={dynamicStyles.inputContainer}>
        <TextInput
          ref={confirmPasswordInputRef}
          style={dynamicStyles.input}
          placeholder="Повторите новый пароль"
          placeholderTextColor={theme.inputPlaceholder}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          editable={!isLoading}
          returnKeyType="done"
          onSubmitEditing={handleChangePassword}
        />
        <TouchableOpacity
          style={dynamicStyles.eyeButton}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons
            name={showConfirmPassword ? 'eye-off' : 'eye'}
            size={22}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={dynamicStyles.errorContainer}>
          <Text style={dynamicStyles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[dynamicStyles.button, isLoading && dynamicStyles.buttonDisabled]}
        onPress={handleChangePassword}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={dynamicStyles.buttonText}>Изменить пароль</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default ChangePasswordContent;
