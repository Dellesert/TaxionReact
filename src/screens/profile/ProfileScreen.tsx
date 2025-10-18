import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@components/common/Avatar';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, mode, isDark, toggleTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    messages: true,
    mentions: true,
    tasks: true,
  });

  const handleLogout = async () => {
  if (Platform.OS === 'web') {
    // Веб: просто выполняем выход
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    } finally {
      setIsLoggingOut(false);
    }
  } else {
    // Мобильные платформы: показываем диалог подтверждения
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
  }
};

  const handleToggleNotification = (key: keyof typeof notifications, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }));
  };

  if (!user) {
    return null;
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingTop: 60,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    userInfoSection: {
      backgroundColor: theme.backgroundSecondary,
      padding: 16,
      marginBottom: 12,
      alignItems: 'center',
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginTop: 16,
    },
    userEmail: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 4,
    },
    departmentBadge: {
      backgroundColor: theme.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 16,
      marginTop: 8,
    },
    departmentText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '500',
    },
    userPosition: {
      fontSize: 14,
      color: theme.textTertiary,
      marginTop: 8,
    },
    section: {
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 12,
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
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
      color: theme.text,
    },
    menuItemValue: {
      fontSize: 14,
      color: theme.textTertiary,
      marginRight: 8,
    },
    logoutContainer: {
      paddingHorizontal: 16,
      marginBottom: 32,
    },
    logoutButton: {
      backgroundColor: theme.primary,
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
      color: theme.textTertiary,
      marginTop: 4,
    },
  });

  return (
    <ScrollView style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.headerTitle}>Профиль</Text>
      </View>

      {/* User Info */}
      <View style={dynamicStyles.userInfoSection}>
        <Avatar uri={user.avatar} name={user.full_name || user.email} size={100} />
        <Text style={dynamicStyles.userName}>{user.full_name || 'Без имени'}</Text>
        <Text style={dynamicStyles.userEmail}>{user.email}</Text>
        {user.department && (
          <View style={dynamicStyles.departmentBadge}>
            <Text style={dynamicStyles.departmentText}>{user.department.name}</Text>
          </View>
        )}
        {user.position && <Text style={dynamicStyles.userPosition}>{user.position}</Text>}
      </View>

      {/* Account Settings */}
      <View style={dynamicStyles.section}>
        <View style={dynamicStyles.sectionHeader}>
          <Text style={dynamicStyles.sectionTitle}>Настройки аккаунта</Text>
        </View>

        <TouchableOpacity style={dynamicStyles.menuItem}>
          <Ionicons name="person-outline" size={24} color={theme.primary} />
          <Text style={dynamicStyles.menuItemText}>Редактировать профиль</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={dynamicStyles.menuItem}>
          <Ionicons name="lock-closed-outline" size={24} color={theme.primary} />
          <Text style={dynamicStyles.menuItemText}>Изменить пароль</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
        <View style={dynamicStyles.menuItem}>
          <View style={dynamicStyles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={24} color={theme.primary} />
            <Text style={dynamicStyles.menuItemText}>Push-уведомления</Text>
          </View>
          <Switch
            value={notifications.push}
            onValueChange={(value) => handleToggleNotification('push', value)}
            trackColor={{ false: '#D1D5DB', true: theme.primaryLight }}
            thumbColor={notifications.push ? theme.primary : '#F3F4F6'}
          />
        </View>
      </View>

      {/* App Settings */}
      <View style={dynamicStyles.section}>
        <View style={dynamicStyles.sectionHeader}>
          <Text style={dynamicStyles.sectionTitle}>Приложение</Text>
        </View>

        <View style={dynamicStyles.menuItem}>
          <View style={dynamicStyles.menuItemLeft}>
            <Ionicons name="color-palette-outline" size={24} color={theme.primary} />
            <Text style={dynamicStyles.menuItemText}>Темная тема</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#D1D5DB', true: '#4B5563' }}
            thumbColor={isDark ? theme.primary : '#F3F4F6'}
          />
        </View>

        <TouchableOpacity style={dynamicStyles.menuItem}>
          <Ionicons name="language-outline" size={24} color={theme.primary} />
          <Text style={dynamicStyles.menuItemText}>Язык</Text>
          <Text style={dynamicStyles.menuItemValue}>Русский</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={[dynamicStyles.menuItem, dynamicStyles.menuItemLast]}>
          <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
          <Text style={dynamicStyles.menuItemText}>О приложении</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={dynamicStyles.logoutContainer}>
        <TouchableOpacity
          style={[dynamicStyles.logoutButton, isLoggingOut && dynamicStyles.logoutButtonDisabled]}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          <Text style={dynamicStyles.logoutButtonText}>
            {isLoggingOut ? 'Выход...' : 'Выйти из аккаунта'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <View style={dynamicStyles.versionInfo}>
        <Text style={dynamicStyles.versionText}>Версия 1.0.0</Text>
        <Text style={dynamicStyles.versionText}>© 2025 Tachyon Messenger</Text>
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
