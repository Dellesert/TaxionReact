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
import { Avatar } from '@shared/components/common/Avatar';
import { useProfileAvatar } from '../../hooks/useProfileAvatar';
import { getRoleLabel } from '@features/admin/utils/roleHelpers';
import { ColorPicker } from '@shared/components/common/ColorPicker';

const EditProfileContent: React.FC = () => {
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { user, setUser } = useAuthStore();
  const { isUploadingAvatar, handleChangeAvatar } = useProfileAvatar();

  const [name, setName] = useState(user?.name || '');
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [middleName, setMiddleName] = useState(user?.middle_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [birthDate, setBirthDate] = useState<Date | undefined>(
    user?.birth_date ? parseISO(user.birth_date) : undefined
  );
  const [color, setColor] = useState(user?.color || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstNameInputRef = useRef<TextInput>(null);
  const lastNameInputRef = useRef<TextInput>(null);
  const middleNameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);

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
      if (birthDate) updateData.birth_date = format(birthDate, 'yyyy-MM-dd');
      if (color) updateData.color = color;

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
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
      color: theme.text,
      marginBottom: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textSecondary,
      lineHeight: 18,
      marginBottom: 6,
      marginTop: 12,
    },
    input: {
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      lineHeight: 20,
      borderWidth: 1,
      backgroundColor: theme.card,
      color: theme.text,
      borderColor: theme.border,
    },
    datePickerButton: {
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.card,
      borderColor: theme.border,
      // @ts-ignore
      cursor: 'pointer',
    },
    datePickerText: {
      fontSize: 14,
      lineHeight: 20,
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
      borderRadius: 10,
      minHeight: 40,
      paddingVertical: 8,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
      backgroundColor: theme.primary,
      // @ts-ignore
      cursor: 'pointer',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 24,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    avatarWrapper: {
      marginBottom: 16,
    },
    changeAvatarButton: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 40,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: theme.primary,
      // @ts-ignore
      cursor: 'pointer',
    },
    changeAvatarButtonDisabled: {
      opacity: 0.6,
    },
    changeAvatarButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
      marginLeft: 8,
    },
    readOnlySection: {
      marginBottom: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    readOnlyField: {
      borderRadius: 10,
      padding: 12,
      backgroundColor: theme.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    readOnlyText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.textSecondary,
    },
    readOnlyRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    readOnlyIcon: {
      marginRight: 8,
    },
  });

  return (
    <View>
      {/* Avatar Section */}
      <View style={dynamicStyles.avatarSection}>
        <View style={dynamicStyles.avatarWrapper}>
          <Avatar
            imageUrl={user?.avatar}
            thumbnailUrl={user?.avatar_thumbnail}
            name={user?.name || user?.email || 'User'}
            size={120}
            useOriginal={true}
            userId={user?.id}
          />
        </View>
        <TouchableOpacity
          style={[
            dynamicStyles.changeAvatarButton,
            isUploadingAvatar && dynamicStyles.changeAvatarButtonDisabled,
          ]}
          onPress={handleChangeAvatar}
          disabled={isUploadingAvatar}
          activeOpacity={0.8}
        >
          {isUploadingAvatar ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="camera" size={18} color="#FFFFFF" />
              <Text style={dynamicStyles.changeAvatarButtonText}>
                {user?.avatar ? 'Изменить фото' : 'Загрузить фото'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* User Information Section (Read-Only) */}
      <View style={dynamicStyles.readOnlySection}>
        <Text style={dynamicStyles.sectionTitle}>Информация о пользователе</Text>

        <Text style={dynamicStyles.label}>Роль</Text>
        <View style={dynamicStyles.readOnlyField}>
          <View style={dynamicStyles.readOnlyRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={theme.textSecondary}
              style={dynamicStyles.readOnlyIcon}
            />
            <Text style={dynamicStyles.readOnlyText}>{getRoleLabel(user?.role || 'employee')}</Text>
          </View>
        </View>

        {user?.department && (
          <>
            <Text style={dynamicStyles.label}>Отдел</Text>
            <View style={dynamicStyles.readOnlyField}>
              <View style={dynamicStyles.readOnlyRow}>
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={theme.textSecondary}
                  style={dynamicStyles.readOnlyIcon}
                />
                <Text style={dynamicStyles.readOnlyText}>{user.department.name}</Text>
              </View>
            </View>
          </>
        )}

        {user?.position && (
          <>
            <Text style={dynamicStyles.label}>Должность</Text>
            <View style={dynamicStyles.readOnlyField}>
              <View style={dynamicStyles.readOnlyRow}>
                <Ionicons
                  name="briefcase-outline"
                  size={18}
                  color={theme.textSecondary}
                  style={dynamicStyles.readOnlyIcon}
                />
                <Text style={dynamicStyles.readOnlyText}>{user.position}</Text>
              </View>
            </View>
          </>
        )}
      </View>

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
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
      </View>

      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Дополнительная информация</Text>

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
          <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={dynamicStyles.section}>
        <Text style={dynamicStyles.sectionTitle}>Цвет в календаре</Text>
        <Text style={[dynamicStyles.label, { marginTop: 0 }]}>
          Этот цвет будет использоваться для отображения ваших отпусков в режиме "по сотруднику"
        </Text>
        <ColorPicker
          value={color}
          onChange={setColor}
          disabled={isLoading}
        />
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
