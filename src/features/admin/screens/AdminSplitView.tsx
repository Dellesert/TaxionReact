/**
 * Admin Split View
 * macOS-style split view для администрирования: sidebar navigation + content area
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useTitleBarControls } from '@shared/contexts/TitleBarControlsContext';
import { AdminSidebarNavigation, AdminSection } from '../components/common/AdminSidebarNavigation';
import { AdminContentArea } from '../components/common/AdminContentArea';

// Import section content components
import AnalyticsDesktopContent from '../components/desktop-content/AnalyticsDesktopContent';
import DepartmentsDesktopContent from '../components/desktop-content/DepartmentsDesktopContent';
import UsersDesktopContent from '../components/desktop-content/UsersDesktopContent';
import UserGroupsDesktopContent from '../components/desktop-content/UserGroupsDesktopContent';

export const AdminSplitView: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [activeSection, setActiveSection] = useState<AdminSection>(isAdmin ? 'analytics' : 'user-groups');

  // Responsive sidebar width
  const sidebarWidth = width < 1024 ? 260 : 320;

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.electron;

  const sectionTitles: Record<AdminSection, string> = {
    'analytics': 'Аналитика',
    'departments': 'Управление отделами',
    'users': 'Пользователи',
    'user-groups': 'Группы пользователей',
  };

  // Set page title only (child components manage their own controls)
  const titleBarControls = useTitleBarControls();

  useEffect(() => {
    if (isElectron) {
      titleBarControls.clearControls();
      titleBarControls.setPageTitle(sectionTitles[activeSection] || 'Администрирование');
    }
  }, [activeSection, isElectron]);

  const handleSectionChange = useCallback((section: AdminSection) => {
    // Clear controls synchronously before re-render so child's useEffect can set new ones
    if (isElectron) {
      titleBarControls.setLeftControls(null);
      titleBarControls.setCenterControls(null);
      titleBarControls.setRightControls(null);
    }
    setActiveSection(section);
  }, [isElectron]);

  const renderContent = () => {
    switch (activeSection) {
      case 'analytics':
        return (
          <AdminContentArea
            title="Аналитика"
            description="Статистика использования системы и ключевые метрики"
          >
            <AnalyticsDesktopContent />
          </AdminContentArea>
        );

      case 'departments':
        return <DepartmentsDesktopContent />;

      case 'users':
        return <UsersDesktopContent />;

      case 'user-groups':
        return <UserGroupsDesktopContent />;

      default:
        return (
          <AdminContentArea
            title="Аналитика"
            description="Статистика использования системы и ключевые метрики"
          >
            <AnalyticsDesktopContent />
          </AdminContentArea>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Sidebar Navigation */}
      <AdminSidebarNavigation
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        userRole={user?.role}
        width={sidebarWidth}
      />

      {/* Content Area */}
      <View style={styles.content}>{renderContent()}</View>
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

export default AdminSplitView;
