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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@components/common/Avatar';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { fileApi } from '@api/fileApi';
import { updateAvatar } from '@api/user.api';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';

const ProfileScreen: React.FC = () => {
  const { user, logout, setUser, refreshUser } = useAuthStore();
  const { theme, mode, isDark, setTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    messages: true,
    mentions: true,
    tasks: true,
  });

  // Refresh user data on mount to ensure we have latest profile
  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        await refreshUser();
        console.log('✅ Profile refreshed on mount');
      } catch (error) {
        console.error('❌ Failed to refresh profile:', error);
      }
    };
    loadProfile();
  }, []);

  // Handle avatar upload
  const handleChangeAvatar = async () => {
    try {
      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          Alert.alert('Ошибка', 'Размер файла не должен превышать 5 МБ');
          return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          Alert.alert('Ошибка', 'Пожалуйста, выберите изображение');
          return;
        }

        setIsUploadingAvatar(true);

        try {
          console.log('📤 Uploading avatar...');

          // Upload file to file-service as PUBLIC file (no auth required to view)
          const uploadedFile = await fileApi.uploadFile(file, 'avatar', undefined, true);
          console.log('✅ Avatar uploaded:', uploadedFile);

          // Use public file URL (no authentication required)
          const avatarUrl = fileApi.getPublicFileUrl(uploadedFile.file_name);
          console.log('📸 Public Avatar URL:', avatarUrl);

          // Update user profile with new avatar URL
          const updatedUser = await updateAvatar(avatarUrl);
          console.log('✅ Profile updated with new avatar:', updatedUser);
          console.log('🔍 Avatar URL in updated profile:', updatedUser?.avatar);
          console.log('🔍 All keys in updated profile:', Object.keys(updatedUser || {}));

          // Update local user state
          setUser(updatedUser);
          console.log('✅ User state updated in store');

          // Also update stored user data
          await secureStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
          console.log('✅ User data saved to storage');

          Alert.alert('Успех', 'Фотография профиля обновлена');
        } catch (error) {
          console.error('❌ Failed to upload avatar:', error);
          Alert.alert('Ошибка', 'Не удалось обновить фотографию. Попробуйте снова.');
        } finally {
          setIsUploadingAvatar(false);
        }
      };

      input.click();
    } catch (error) {
      console.error('❌ Error opening file picker:', error);
      Alert.alert('Ошибка', 'Не удалось открыть выбор файла');
    }
  };

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

  const getThemeLabel = (themeMode: typeof mode): string => {
    switch (themeMode) {
      case 'light':
        return 'Светлая';
      case 'dark':
        return 'Тёмная';
      case 'system':
        return 'Системная';
      default:
        return 'Системная';
    }
  };

  const handleThemePress = () => {
    if (Platform.OS === 'web') {
      // На web просто переключаем
      const modes: Array<typeof mode> = ['system', 'light', 'dark'];
      const currentIndex = modes.indexOf(mode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      setTheme(nextMode);
    } else {
      // На мобильных показываем диалог выбора
      Alert.alert(
        'Выбор темы',
        'Выберите тему оформления приложения',
        [
          {
            text: 'Системная',
            onPress: () => setTheme('system'),
          },
          {
            text: 'Светлая',
            onPress: () => setTheme('light'),
          },
          {
            text: 'Тёмная',
            onPress: () => setTheme('dark'),
          },
          {
            text: 'Отмена',
            style: 'cancel',
          },
        ]
      );
    }
  };

  if (!user) {
    return null;
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.primaryDark,
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingTop: 12,
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
      backgroundColor: theme.primaryDark,
      padding: 16,
      marginBottom: 12,
      alignItems: 'center',
    },
    userAvatar: {
      borderWidth: 1,
      borderRadius: 50,
      borderColor: '#cf0000ff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginTop: 16,
    },
    userEmail: {
      fontSize: 16,
      color: '#FFFFFF',
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
      color: '#FFFFFF',
      fontWeight: '500',
    },
    userPosition: {
      fontSize: 14,
      color: '#FFFFFF',
      marginTop: 8,
    },
    card: {
    backgroundColor: theme.backgroundSecondary, // «поверхность»
    borderTopLeftRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? theme.border : 'transparent',
    overflow: 'hidden',
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
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }}>
      {/* User Info */}
      <View style={dynamicStyles.userInfoSection}>
        <Avatar style={dynamicStyles.userAvatar} imageUrl={user.avatar} name={user.name || user.email} size={100} />
        <Text style={dynamicStyles.userName}>{user.name || 'Без имени'}</Text>
        <Text style={dynamicStyles.userEmail}>{user.email}</Text>
        {user.department && (
          <View style={dynamicStyles.departmentBadge}>
            <Text style={dynamicStyles.departmentText}>{user.department.name}</Text>
          </View>
        )}
        {user.position && <Text style={dynamicStyles.userPosition}>{user.position}</Text>}
      </View>
    <View style={[styles.card, dynamicStyles.card]}>
      <View style={dynamicStyles.section}>
        <TouchableOpacity style={dynamicStyles.menuItem}>
          <Ionicons name="pencil-outline" size={22} color={theme.primary} />
          <Text style={dynamicStyles.menuItemText}>Изменить статус</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={dynamicStyles.menuItem}
          onPress={handleChangeAvatar}
          disabled={isUploadingAvatar}
        >
          <Ionicons name="camera-outline" size={24} color={theme.primary} />
          <Text style={dynamicStyles.menuItemText}>Изменить фотографию</Text>
          {isUploadingAvatar ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginRight: 8 }} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Account Settings */}
      <View style={dynamicStyles.section}>
        <TouchableOpacity style={dynamicStyles.menuItem}>
          <Ionicons style={[styles.menuIcon, {backgroundColor: '#e9af44ff'}]}  name="person-outline" size={20} color={theme.primary} />
          <Text style={dynamicStyles.menuItemText}>Профиль</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={dynamicStyles.menuItem}>
          <Ionicons style={[styles.menuIcon, {backgroundColor: '#a2a2a2ff'}]} name="lock-closed-outline" size={20} color={theme.primary} />
          <Text style={[dynamicStyles.menuItemText]}>Конфиденциальность</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
        <View style={dynamicStyles.menuItem}>
          <View style={dynamicStyles.menuItemLeft}>
            <Ionicons style={[styles.menuIcon, {backgroundColor: '#E94444'}]} name="notifications-outline" size={20} color={theme.primary} />
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
        <TouchableOpacity style={dynamicStyles.menuItem} onPress={handleThemePress}>
          <Ionicons style={[styles.menuIcon, {backgroundColor: '#44aae9ff'}]} name="color-palette-outline" size={20} color={theme.primary} />
          <Text style={dynamicStyles.menuItemText}>Тема оформления</Text>
          <Text style={dynamicStyles.menuItemValue}>{getThemeLabel(mode)}</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={dynamicStyles.menuItem}>
          <Ionicons style={[styles.menuIcon, {backgroundColor: '#9444e9ff'}]} name="language-outline" size={20} color={theme.primary} />
          <Text style={dynamicStyles.menuItemText}>Язык</Text>
          <Text style={dynamicStyles.menuItemValue}>Русский</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={[dynamicStyles.menuItem, dynamicStyles.menuItemLast]}>
          <Ionicons style={[styles.menuIcon, {backgroundColor: '#3ed6ccff'}]} name="information-circle-outline" size={20} color={theme.primary} />
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
      </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: 12,
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
  card: {
    borderTopRightRadius: 12,
    borderTopLeftRadius: 12,
    height: '100%',
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
  menuIcon: {
    color: '#FFFFFF',
    padding: 4,
    borderRadius: 6,
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
