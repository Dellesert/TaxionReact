/**
 * Register Screen
 * Экран регистрации нового пользователя
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { useAuth } from '@hooks/useAuth';
import { Button, Input } from '@components/common';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { register, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateName = (name: string): boolean => {
    if (!name) {
      setNameError('Имя обязательно');
      return false;
    }
    if (name.length < 2) {
      setNameError('Имя должно содержать минимум 2 символа');
      return false;
    }
    setNameError('');
    return true;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email обязателен');
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError('Неверный формат email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Пароль обязателен');
      return false;
    }
    if (password.length < 6) {
      setPasswordError('Пароль должен содержать минимум 6 символов');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateConfirmPassword = (confirmPassword: string): boolean => {
    if (!confirmPassword) {
      setConfirmPasswordError('Подтверждение пароля обязательно');
      return false;
    }
    if (confirmPassword !== password) {
      setConfirmPasswordError('Пароли не совпадают');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handleRegister = async () => {
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    try {
      await register({ name, email, password });
      Alert.alert('Успех', 'Регистрация прошла успешно!');
    } catch (err: any) {
      Alert.alert('Ошибка регистрации', err.message || 'Не удалось зарегистрироваться');
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Создать аккаунт</Text>
          <Text style={styles.subtitle}>Заполните данные для регистрации</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Имя"
            placeholder="Иван Иванов"
            value={name}
            onChangeText={setName}
            error={nameError}
            leftIcon="person-outline"
            autoComplete="name"
            editable={!isLoading}
          />

          <Input
            label="Email"
            placeholder="example@company.com"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            leftIcon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!isLoading}
          />

          <Input
            label="Пароль"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            leftIcon="lock-closed-outline"
            secureTextEntry
            autoComplete="password-new"
            editable={!isLoading}
          />

          <Input
            label="Подтвердите пароль"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={confirmPasswordError}
            leftIcon="lock-closed-outline"
            secureTextEntry
            autoComplete="password-new"
            editable={!isLoading}
          />

          <Button
            title="Зарегистрироваться"
            onPress={handleRegister}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            style={styles.registerButton}
          />

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Уже есть аккаунт? </Text>
            <Button
              title="Войти"
              onPress={() => navigation.navigate('Login')}
              variant="outline"
              size="small"
              disabled={isLoading}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  registerButton: {
    marginTop: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default RegisterScreen;
