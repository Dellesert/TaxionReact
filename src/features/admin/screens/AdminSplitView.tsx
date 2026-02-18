/**
 * Admin Split View
 * macOS-style split view для администрирования: sidebar navigation + content area
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
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

  // Clear TitleBar controls when entering admin section
  useTitleBarControlsIntegration({
    pageTitle: 'Администрирование',
    leftControls: null,
    rightControls: null,
    enabled: isElectron,
  });

  const handleSectionChange = useCallback((section: AdminSection) => {
    setActiveSection(section);
  }, []);

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
