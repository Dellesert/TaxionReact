/**
 * Admin Split View
 * macOS-style split view для администрирования: sidebar navigation + content area
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { AdminSidebarNavigation, AdminSection } from '../components/common/AdminSidebarNavigation';
import { AdminContentArea } from '../components/common/AdminContentArea';

// Import section content components
import AnalyticsDesktopContent from '../components/desktop-content/AnalyticsDesktopContent';
import DepartmentsDesktopContent from '../components/desktop-content/DepartmentsDesktopContent';
import UsersDesktopContent from '../components/desktop-content/UsersDesktopContent';
import UserGroupsDesktopContent from '../components/desktop-content/UserGroupsDesktopContent';

export const AdminSplitView: React.FC = () => {
  const { theme } = useTheme();
  const [activeSection, setActiveSection] = useState<AdminSection>('analytics');

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
