import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@components/common/Avatar';
import { useAuthStore } from '@store/authStore';

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    messages: true,
    mentions: true,
    tasks: true,
  });

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

  const handleToggleNotification = (key: keyof typeof notifications, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Профиль</Text>
      </View>

      {/* User Info */}
      <View style={styles.userInfoSection}>
        <Avatar uri={user.avatar} name={user.full_name || user.email} size={100} />
        <Text style={styles.userName}>{user.full_name || 'Без имени'}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        {user.department && (
          <View style={styles.departmentBadge}>
            <Text style={styles.departmentText}>{user.department.name}</Text>
          </View>
        )}
        {user.position && <Text style={styles.userPosition}>{user.position}</Text>}
      </View>

      {/* Account Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Настройки аккаунта</Text>
        </View>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={24} color="#E94444" />
          <Text style={styles.menuItemText}>Редактировать профиль</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="lock-closed-outline" size={24} color="#E94444" />
          <Text style={styles.menuItemText}>Изменить пароль</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#E94444" />
          <Text style={styles.menuItemText}>Безопасность</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Notification Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Уведомления</Text>
        </View>

        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={24} color="#E94444" />
            <Text style={styles.menuItemText}>Push-уведомления</Text>
          </View>
          <Switch
            value={notifications.push}
            onValueChange={(value) => handleToggleNotification('push', value)}
            trackColor={{ false: '#D1D5DB', true: '#efefefff' }}
            thumbColor={notifications.push ? '#E94444' : '#F3F4F6'}
          />
        </View>

        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="mail-outline" size={24} color="#E94444" />
            <Text style={styles.menuItemText}>Email-уведомления</Text>
          </View>
          <Switch
            value={notifications.email}
            onValueChange={(value) => handleToggleNotification('email', value)}
            trackColor={{ false: '#D1D5DB', true: '#efefefff' }}
            thumbColor={notifications.email ? '#E94444' : '#ffffffff'}
          />
        </View>

        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="chatbox-outline" size={24} color="#E94444" />
            <Text style={styles.menuItemText}>Новые сообщения</Text>
          </View>
          <Switch
            value={notifications.messages}
            onValueChange={(value) => handleToggleNotification('messages', value)}
            trackColor={{ false: '#D1D5DB', true: '#efefefff' }}
            thumbColor={notifications.messages ? '#E94444' : '#F3F4F6'}
          />
        </View>

        <View style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="at-outline" size={24} color="#E94444" />
            <Text style={styles.menuItemText}>Упоминания</Text>
          </View>
          <Switch
            value={notifications.mentions}
            onValueChange={(value) => handleToggleNotification('mentions', value)}
            trackColor={{ false: '#D1D5DB', true: '#efefefff' }}
            thumbColor={notifications.mentions ? '#E94444' : '#F3F4F6'}
          />
        </View>

        <View style={[styles.menuItem, styles.menuItemLast]}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#E94444" />
            <Text style={styles.menuItemText}>Задачи</Text>
          </View>
          <Switch
            value={notifications.tasks}
            onValueChange={(value) => handleToggleNotification('tasks', value)}
            trackColor={{ false: '#D1D5DB', true: '#efefefff' }}
            thumbColor={notifications.tasks ? '#E94444' : '#F3F4F6'}
          />
        </View>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Приложение</Text>
        </View>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="color-palette-outline" size={24} color="#E94444" />
          <Text style={styles.menuItemText}>Тема оформления</Text>
          <Text style={styles.menuItemValue}>Светлая</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="language-outline" size={24} color="#E94444" />
          <Text style={styles.menuItemText}>Язык</Text>
          <Text style={styles.menuItemValue}>Русский</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]}>
          <Ionicons name="information-circle-outline" size={24} color="#E94444" />
          <Text style={styles.menuItemText}>О приложении</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity
          style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <Text style={styles.logoutButtonText}>
            {isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>Версия 1.0.0</Text>
        <Text style={styles.versionText}>© 2025 Tachyon Messenger</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  userInfoSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  departmentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 8,
  },
  departmentText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  userPosition: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  menuItemValue: {
    fontSize: 14,
    color: '#9CA3AF',
    marginRight: 8,
  },
  logoutContainer: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  logoutButton: {
    backgroundColor: '#E94444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  versionInfo: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});

export default ProfileScreen;
