/**
 * Profile Split View
 * macOS-style split view: sidebar navigation + content area
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
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
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { isLoggingOut, handleLogout } = useProfileActions();

  const [activeSection, setActiveSection] = useState<ProfileSection>('profile');

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
            title="Хранилище и память"
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
      <View style={styles.content}>
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
  },
});

export default ProfileSplitView;
