import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { Avatar } from '@components/common/Avatar';
import { Button } from '@components/common/Button';
import { useNotificationStore } from '@store/notificationStore';

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { preferences, updatePreferences } = useNotificationStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Выход', 'Вы уверены, что хотите выйти?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            await logout();
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось выйти из аккаунта');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleToggleNotification = async (key: keyof typeof preferences, value: boolean) => {
    try {
      await updatePreferences({ [key]: value });
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить настройки');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 pt-3 pb-2 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900">Профиль</Text>
      </View>

      {/* User Info */}
      <View className="bg-white p-4 mb-3 items-center">
        <Avatar
          source={user.avatar}
          name={user.full_name || user.email}
          size={100}
          status={user.status}
        />
        <Text className="text-2xl font-bold text-gray-900 mt-4">
          {user.full_name || 'Без имени'}
        </Text>
        <Text className="text-base text-gray-600 mt-1">{user.email}</Text>
        {user.department && (
          <View className="bg-blue-100 px-3 py-1 rounded-full mt-2">
            <Text className="text-sm text-blue-700 font-medium">{user.department.name}</Text>
          </View>
        )}
        {user.position && (
          <Text className="text-sm text-gray-500 mt-2">{user.position}</Text>
        )}
      </View>

      {/* Account Settings */}
      <View className="bg-white mb-3">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text className="text-sm font-semibold text-gray-700">Настройки аккаунта</Text>
        </View>

        <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <Ionicons name="person-outline" size={24} color="#3B82F6" />
          <Text className="flex-1 ml-3 text-base text-gray-900">Редактировать профиль</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <Ionicons name="lock-closed-outline" size={24} color="#3B82F6" />
          <Text className="flex-1 ml-3 text-base text-gray-900">Изменить пароль</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center px-4 py-3">
          <Ionicons name="shield-checkmark-outline" size={24} color="#3B82F6" />
          <Text className="flex-1 ml-3 text-base text-gray-900">Безопасность</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Notification Settings */}
      <View className="bg-white mb-3">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text className="text-sm font-semibold text-gray-700">Уведомления</Text>
        </View>

        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center flex-1">
            <Ionicons name="notifications-outline" size={24} color="#3B82F6" />
            <Text className="ml-3 text-base text-gray-900">Push-уведомления</Text>
          </View>
          <Switch
            value={preferences.push_enabled}
            onValueChange={(value) => handleToggleNotification('push_enabled', value)}
          />
        </View>

        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center flex-1">
            <Ionicons name="mail-outline" size={24} color="#3B82F6" />
            <Text className="ml-3 text-base text-gray-900">Email-уведомления</Text>
          </View>
          <Switch
            value={preferences.email_enabled}
            onValueChange={(value) => handleToggleNotification('email_enabled', value)}
          />
        </View>

        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center flex-1">
            <Ionicons name="chatbox-outline" size={24} color="#3B82F6" />
            <Text className="ml-3 text-base text-gray-900">Новые сообщения</Text>
          </View>
          <Switch
            value={preferences.new_message}
            onValueChange={(value) => handleToggleNotification('new_message', value)}
          />
        </View>

        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center flex-1">
            <Ionicons name="at-outline" size={24} color="#3B82F6" />
            <Text className="ml-3 text-base text-gray-900">Упоминания</Text>
          </View>
          <Switch
            value={preferences.mentions}
            onValueChange={(value) => handleToggleNotification('mentions', value)}
          />
        </View>

        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-row items-center flex-1">
            <Ionicons name="checkmark-circle-outline" size={24} color="#3B82F6" />
            <Text className="ml-3 text-base text-gray-900">Задачи</Text>
          </View>
          <Switch
            value={preferences.tasks}
            onValueChange={(value) => handleToggleNotification('tasks', value)}
          />
        </View>
      </View>

      {/* App Settings */}
      <View className="bg-white mb-3">
        <View className="px-4 py-3 border-b border-gray-100">
          <Text className="text-sm font-semibold text-gray-700">Приложение</Text>
        </View>

        <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <Ionicons name="color-palette-outline" size={24} color="#3B82F6" />
          <Text className="flex-1 ml-3 text-base text-gray-900">Тема оформления</Text>
          <Text className="text-sm text-gray-500 mr-2">Светлая</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <Ionicons name="language-outline" size={24} color="#3B82F6" />
          <Text className="flex-1 ml-3 text-base text-gray-900">Язык</Text>
          <Text className="text-sm text-gray-500 mr-2">Русский</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity className="flex-row items-center px-4 py-3">
          <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
          <Text className="flex-1 ml-3 text-base text-gray-900">О приложении</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View className="px-4 mb-8">
        <Button
          title="Выйти из аккаунта"
          onPress={handleLogout}
          variant="danger"
          disabled={isLoggingOut}
        />
      </View>

      {/* Version Info */}
      <View className="items-center pb-6">
        <Text className="text-xs text-gray-400">Версия 1.0.0</Text>
        <Text className="text-xs text-gray-400 mt-1">© 2025 Tachyon Messenger</Text>
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;
