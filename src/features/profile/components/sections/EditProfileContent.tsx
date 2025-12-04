/**
 * Edit Profile Content
 * Контент для редактирования профиля (адаптирован для desktop split-view)
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { updateProfile } from '@api/user.api';
import { useAuthStore } from '@shared/store/authStore';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const EditProfileContent: React.FC = () => {
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
    setShowDatePicker(false);
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
    } catch (err: any) {
      console.error('❌ Failed to update profile:', err);
      setError(err.message || 'Не удалось обновить профиль');
      showError(err.message || 'Не удалось обновить профиль');
    } finally {
      setIsLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
      marginBottom: 8,
      marginTop: 12,
    },
    input: {
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      borderWidth: 1,
      backgroundColor: theme.card,
      color: theme.text,
      borderColor: theme.border,
    },
    datePickerButton: {
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    datePickerText: {
      fontSize: 16,
      flex: 1,
    },
    errorContainer: {
      backgroundColor: '#7F1D1D',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
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
      marginTop: 24,
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
      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Основная информация</Text>

        <Text style={dynamicStyles.label}>Имя пользователя (обязательно)</Text>
        <TextInput
          style={dynamicStyles.input}
          placeholder="Никнейм или отображаемое имя"
          placeholderTextColor={theme.inputPlaceholder}
          value={name}
          onChangeText={setName}
          editable={!isLoading}
          returnKeyType="next"
          onSubmitEditing={() => firstNameInputRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text style={dynamicStyles.label}>Имя</Text>
        <TextInput
          ref={firstNameInputRef}
          style={dynamicStyles.input}
          placeholder="Введите имя"
          placeholderTextColor={theme.inputPlaceholder}
          value={firstName}
          onChangeText={setFirstName}
          editable={!isLoading}
          returnKeyType="next"
          onSubmitEditing={() => lastNameInputRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text style={dynamicStyles.label}>Фамилия</Text>
        <TextInput
          ref={lastNameInputRef}
          style={dynamicStyles.input}
          placeholder="Введите фамилию"
          placeholderTextColor={theme.inputPlaceholder}
          value={lastName}
          onChangeText={setLastName}
          editable={!isLoading}
          returnKeyType="next"
          onSubmitEditing={() => middleNameInputRef.current?.focus()}
          blurOnSubmit={false}
        />

        <Text style={dynamicStyles.label}>Отчество</Text>
        <TextInput
          ref={middleNameInputRef}
          style={dynamicStyles.input}
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

      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Контактная информация</Text>

        <Text style={dynamicStyles.label}>Телефон</Text>
        <TextInput
          ref={phoneInputRef}
          style={dynamicStyles.input}
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

      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Дополнительная информация</Text>

        <Text style={dynamicStyles.label}>Должность</Text>
        <TextInput
          ref={positionInputRef}
          style={dynamicStyles.input}
          placeholder="Ваша должность"
          placeholderTextColor={theme.inputPlaceholder}
          value={position}
          onChangeText={setPosition}
          editable={!isLoading}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        <Text style={dynamicStyles.label}>Дата рождения</Text>
        <TouchableOpacity
          style={dynamicStyles.datePickerButton}
          onPress={() => setShowDatePicker(true)}
          disabled={isLoading}
        >
          <Text
            style={[
              dynamicStyles.datePickerText,
              { color: birthDate ? theme.text : theme.inputPlaceholder },
            ]}
          >
            {birthDate ? format(birthDate, 'dd MMMM yyyy', { locale: ru }) : 'Выберите дату рождения'}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={dynamicStyles.errorContainer}>
          <Text style={dynamicStyles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[dynamicStyles.button, isLoading && dynamicStyles.buttonDisabled]}
        onPress={handleSave}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={dynamicStyles.buttonText}>Сохранить изменения</Text>
        )}
      </TouchableOpacity>

      {showDatePicker && (
        <DatePickerModal
          visible={showDatePicker}
          value={birthDate || new Date()}
          onChange={handleDateChange}
          onClose={() => setShowDatePicker(false)}
          mode="date"
        />
      )}
    </View>
  );
};

export default EditProfileContent;
