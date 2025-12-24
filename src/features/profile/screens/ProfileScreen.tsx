import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
import { useProfileAvatar } from '../hooks/useProfileAvatar';
import { useProfileActions } from '../hooks/useProfileActions';
import { ProfileHeader } from '../components/common/ProfileHeader';
import { ProfileMenuSection } from '../components/common/ProfileMenuSection';
import { ProfileMenuItem } from '../components/common/ProfileMenuItem';
import { getThemeLabel, isAdmin } from '../utils/profileHelpers';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuthStore();
  const { theme, mode, isDark } = useTheme();
  const { isUploadingAvatar, handleChangeAvatar } = useProfileAvatar();
  const { isLoggingOut, handleLogout, handleThemePress } = useProfileActions();

  // Refresh user data on mount to ensure we have latest profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        await refreshUser();
      } catch (error) {
        console.error('❌ Failed to refresh profile:', error);
      }
    };
    loadProfile();
  }, [refreshUser]);

  if (!user) {
    return null;
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.primary,
    },
    scrollContent: {},
    card: {
      backgroundColor: isDark ? theme.background : '#F3F4F6',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 20,
      paddingHorizontal: 12,
      paddingBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 8,
      flex: 1,
    },
    logoutContainer: {
      paddingHorizontal: 4,
      marginTop: 8,
      marginBottom: 24,
    },
    logoutButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    logoutButtonDisabled: {
      opacity: 0.6,
    },
    logoutButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    versionInfo: {
      alignItems: 'center',
      paddingBottom: 150,
      paddingTop: 8,
    },
    versionText: {
      fontSize: 11,
      color: theme.textTertiary,
      marginTop: 2,
      opacity: 0.7,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Info */}
        <ProfileHeader user={user} />

        <View style={dynamicStyles.card}>
          {/* Profile Actions */}
          <ProfileMenuSection title="ПРОФИЛЬ">
            <ProfileMenuItem
              icon="create-outline"
              iconColor="#3B82F6"
              text="Редактировать профиль"
              onPress={() => navigation.navigate('EditProfile')}
            />
            <ProfileMenuItem
              icon="camera-outline"
              iconColor="#8B5CF6"
              text="Изменить фотографию"
              onPress={handleChangeAvatar}
              isLoading={isUploadingAvatar}
              disabled={isUploadingAvatar}
              isLast
            />
          </ProfileMenuSection>

          {/* Security Settings */}
          <ProfileMenuSection title="БЕЗОПАСНОСТЬ">
            <ProfileMenuItem
              icon="lock-closed-outline"
              iconColor="#F59E0B"
              text="Изменить пароль"
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <ProfileMenuItem
              icon="phone-portrait-outline"
              iconColor="#44e9a2ff"
              text="Активные устройства"
              onPress={() => navigation.navigate('ActiveSessions')}
            />
            <ProfileMenuItem
              icon="key-outline"
              iconColor="#6366F1"
              text="Ключ входа"
              onPress={() => navigation.navigate('PasskeyManagement')}
              isLast
            />
          </ProfileMenuSection>

          {/* Admin Section - Only for admin and super_admin */}
          {isAdmin(user) && (
            <ProfileMenuSection title="АДМИНИСТРИРОВАНИЕ">
              <ProfileMenuItem
                icon="bar-chart-outline"
                iconColor="#3B82F6"
                text="Аналитика"
                onPress={() => navigation.navigate('Analytics')}
              />
              <ProfileMenuItem
                icon="business-outline"
                iconColor="#e944d6ff"
                text="Управление отделами"
                onPress={() => navigation.navigate('Departments')}
              />
              <ProfileMenuItem
                icon="people-outline"
                iconColor="#e99444ff"
                text="Управление пользователями"
                onPress={() => navigation.navigate('Users')}
                isLast
              />
            </ProfileMenuSection>
          )}

          {/* App Settings */}
          <ProfileMenuSection title="НАСТРОЙКИ">
            <ProfileMenuItem
              icon="notifications-outline"
              iconColor="#E94444"
              text="Уведомления"
              onPress={() => navigation.navigate('NotificationSettings')}
            />
            <ProfileMenuItem
              icon="color-palette-outline"
              iconColor="#44aae9ff"
              text="Тема оформления"
              value={getThemeLabel(mode)}
              onPress={handleThemePress}
            />
            <ProfileMenuItem
              icon="server-outline"
              iconColor="#10B981"
              text="Данные и память"
              onPress={() => navigation.navigate('Storage')}
            />
            <ProfileMenuItem
              icon="information-circle-outline"
              iconColor="#3ed6ccff"
              text="О приложении"
              onPress={() => navigation.navigate('About')}
              isLast
            />
          </ProfileMenuSection>

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
    </View>
  );
};

export default ProfileScreen;
