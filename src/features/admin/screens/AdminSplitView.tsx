/**
 * Admin Split View
 * macOS-style split view для администрирования: sidebar navigation + content area
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [activeSection, setActiveSection] = useState<AdminSection>(isAdmin ? 'analytics' : 'user-groups');

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

  // Restore controls when navigating back from sub-screens (e.g. MetricsAnalytics → AdminHub)
  useFocusEffect(
    useCallback(() => {
      if (isElectron) {
        titleBarControls.clearControls();
        titleBarControls.setPageTitle(sectionTitles[activeSection] || 'Администрирование');
      }
    }, [isElectron, activeSection])
  );

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
        return (
          <AdminContentArea
            title="Отделы"
            description="Управление структурой организации"
            scrollable={false}
            noPadding
          >
            <DepartmentsDesktopContent />
          </AdminContentArea>
        );

      case 'users':
        return (
          <AdminContentArea
            title="Пользователи"
            description="Управление учётными записями и ролями пользователей"
            scrollable={false}
            noPadding
          >
            <UsersDesktopContent />
          </AdminContentArea>
        );

      case 'user-groups':
        return (
          <AdminContentArea
            title="Группы"
            description="Управление группами пользователей"
            scrollable={false}
            noPadding
          >
            <UserGroupsDesktopContent />
          </AdminContentArea>
        );

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

  const cardBgColor = isDark ? theme.card : '#FFFFFF';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Sidebar Navigation */}
      <AdminSidebarNavigation
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        userRole={user?.role}
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

export default AdminSplitView;
