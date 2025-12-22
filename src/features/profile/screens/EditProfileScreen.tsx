/**
 * Edit Profile Screen
 * Экран редактирования профиля пользователя
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
import { updateProfile } from '@api/user.api';
import { useAuthStore } from '@shared/store/authStore';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

type NavigationProp = NativeStackNavigationProp<any>;

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [middleName, setMiddleName] = useState(user?.middle_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [position, setPosition] = useState(user?.position || '');
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    user?.birth_date ? parseISO(user.birth_date) : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstNameInputRef = useRef<TextInput>(null);
  const lastNameInputRef = useRef<TextInput>(null);
  const middleNameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const positionInputRef = useRef<TextInput>(null);

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    // Убрали setShowDatePicker(false) - теперь DatePickerModal сам управляет закрытием через onClose
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleSave = async () => {
    setError(null);
    Keyboard.dismiss();

    // Validation
    if (!name.trim()) {
      setError('Введите имя пользователя');
      return;
    }

    // Validate phone format if provided
    if (phone.trim() && !/^\+?\d{10,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      setError('Введите корректный номер телефона');
      return;
    }

    setIsLoading(true);

    try {
      const updateData: any = {};

      // Only send fields that have values
      if (name.trim()) updateData.name = name.trim();
      if (firstName.trim()) updateData.first_name = firstName.trim();
      if (lastName.trim()) updateData.last_name = lastName.trim();
      if (middleName.trim()) updateData.middle_name = middleName.trim();
      if (phone.trim()) updateData.phone = phone.trim();
      if (position.trim()) updateData.position = position.trim();
      if (birthDate) updateData.birth_date = format(birthDate, 'yyyy-MM-dd');


      const updatedUser = await updateProfile(updateData);


      // Update local user state
      setUser(updatedUser);

      // Also update stored user data
      await secureStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));

      showSuccess('Профиль успешно обновлён');
      navigation.goBack();
    } catch (err: any) {
      console.error('❌ Failed to update profile:', err);
      setError(err.message || 'Не удалось обновить профиль');
      showError(err.message || 'Не удалось обновить профиль');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundSecondary }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Редактировать профиль</Text>
        <View style={{ width: 40 }} />
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
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Основная информация</Text>

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Имя пользователя (обязательно)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Никнейм или отображаемое имя"
                placeholderTextColor={theme.inputPlaceholder}
                value={name}
                onChangeText={setName}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => firstNameInputRef.current?.focus()}
                blurOnSubmit={false}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Имя</Text>
              <TextInput
                ref={firstNameInputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Введите имя"
                placeholderTextColor={theme.inputPlaceholder}
                value={firstName}
                onChangeText={setFirstName}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => lastNameInputRef.current?.focus()}
                blurOnSubmit={false}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Фамилия</Text>
              <TextInput
                ref={lastNameInputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Введите фамилию"
                placeholderTextColor={theme.inputPlaceholder}
                value={lastName}
                onChangeText={setLastName}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => middleNameInputRef.current?.focus()}
                blurOnSubmit={false}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Отчество</Text>
              <TextInput
                ref={middleNameInputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Введите отчество"
                placeholderTextColor={theme.inputPlaceholder}
                value={middleName}
                onChangeText={setMiddleName}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => phoneInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Контактная информация</Text>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Телефон</Text>
              <TextInput
                ref={phoneInputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="+7 999 999 99 99"
                placeholderTextColor={theme.inputPlaceholder}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => positionInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Дополнительная информация</Text>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Должность</Text>
              <TextInput
                ref={positionInputRef}
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  }
                ]}
                placeholder="Ваша должность"
                placeholderTextColor={theme.inputPlaceholder}
                value={position}
                onChangeText={setPosition}
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Дата рождения</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  }
                ]}
                onPress={() => setShowDatePicker(true)}
                disabled={isLoading}
              >
                <Text style={[
                  styles.datePickerText,
                  { color: birthDate ? theme.text : theme.inputPlaceholder }
                ]}>
                  {birthDate ? format(birthDate, 'dd MMMM yyyy', { locale: ru }) : 'Выберите дату рождения'}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
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
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Сохранить изменения</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showDatePicker && (
        <DatePickerModal
          visible={showDatePicker}
          value={birthDate || new Date()}
          onChange={handleDateChange}
          onClose={() => setShowDatePicker(false)}
          mode="date"
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  datePickerButton: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerText: {
    fontSize: 16,
    flex: 1,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
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

export default EditProfileScreen;
