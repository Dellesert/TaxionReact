/**
 * Profile Split View
 * macOS-style split view: sidebar navigation + content area
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { ProfileSidebarNavigation, ProfileSection } from '../components/common/ProfileSidebarNavigation';
import { ProfileContentArea } from '../components/common/ProfileContentArea';
import { useProfileActions } from '../hooks/useProfileActions';

// Import section content components
import EditProfileContent from '../components/sections/EditProfileContent';
import ChangePasswordContent from '../components/sections/ChangePasswordContent';
import ActiveSessionsContent from '../components/sections/ActiveSessionsContent';
import PasskeyManagementContent from '../components/sections/PasskeyManagementContent';
import NotificationSettingsContent from '../components/sections/NotificationSettingsContent';
import ThemeSettingsContent from '../components/sections/ThemeSettingsContent';
import StorageContent from '../components/sections/StorageContent';
import AboutContent from '../components/sections/AboutContent';

export const ProfileSplitView: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();
  const { isLoggingOut, handleLogout } = useProfileActions();
  const isDesktop = useIsWideScreen();

  const [activeSection, setActiveSection] = useState<ProfileSection>('profile');

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

  // Integrate with TitleBar in Electron desktop
  useTitleBarControlsIntegration({
    pageTitle: 'Настройки',
    leftControls: null,
    rightControls: null,
    enabled: isElectron && isDesktop,
  });

  const handleSectionChange = useCallback((section: ProfileSection) => {
    setActiveSection(section);
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <ProfileContentArea
            title="Общие настройки"
            description="Редактирование профиля и основной информации"
          >
            <EditProfileContent />
          </ProfileContentArea>
        );

      case 'change-password':
        return (
          <ProfileContentArea
            title="Изменение пароля"
            description="Обновите пароль для входа в систему"
          >
            <ChangePasswordContent />
          </ProfileContentArea>
        );

      case 'active-sessions':
        return (
          <ProfileContentArea
            title="Активные устройства"
            description="Управление устройствами, на которых выполнен вход"
          >
            <ActiveSessionsContent />
          </ProfileContentArea>
        );

      case 'passkey':
        return (
          <ProfileContentArea
            title="Ключ входа"
            description="Настройте биометрическую аутентификацию"
          >
            <PasskeyManagementContent />
          </ProfileContentArea>
        );

      case 'notifications':
        return (
          <ProfileContentArea
            title="Уведомления"
            description="Управление способами и типами уведомлений"
          >
            <NotificationSettingsContent />
          </ProfileContentArea>
        );

      case 'theme':
        return (
          <ProfileContentArea
            title="Тема оформления"
            description="Настройте внешний вид приложения"
          >
            <ThemeSettingsContent />
          </ProfileContentArea>
        );

      case 'storage':
        return (
          <ProfileContentArea
            title="Данные и память"
            description="Управление занятым местом и кешем"
          >
            <StorageContent />
          </ProfileContentArea>
        );

      case 'about':
        return (
          <ProfileContentArea
            title="О приложении"
            description="Информация о версии и разработчиках"
          >
            <AboutContent />
          </ProfileContentArea>
        );

      default:
        return (
          <ProfileContentArea
            title="Общие настройки"
            description="Основная информация вашего профиля"
          >
            <EditProfileContent />
          </ProfileContentArea>
        );
    }
  };

  // Card background - white for light mode to stand out from gray background
  const cardBgColor = isDark ? theme.card : '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Sidebar Navigation */}
      <ProfileSidebarNavigation
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        user={user}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      {/* Content Area */}
      <View style={[styles.content, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
        {renderContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    marginLeft: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
});

export default ProfileSplitView;
