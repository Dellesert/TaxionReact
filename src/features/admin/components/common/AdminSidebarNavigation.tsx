/**
 * Admin Sidebar Navigation
 * macOS-style sidebar navigation для раздела администрирования
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { UserRole } from '@/types/user.types';

export type AdminSection = 'analytics' | 'departments' | 'users' | 'user-groups';

interface SidebarItem {
  id: AdminSection;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  minRole: 'department_head' | 'admin';
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

interface AdminSidebarNavigationProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  userRole?: UserRole;
  width?: number;
}

const ADMIN_SIDEBAR_STRUCTURE: SidebarGroup[] = [
  {
    title: 'АНАЛИТИКА',
    items: [
      { id: 'analytics', label: 'Статистика', icon: 'bar-chart-outline', iconColor: '#3B82F6', minRole: 'admin' },
    ],
  },
  {
    title: 'УПРАВЛЕНИЕ',
    items: [
      { id: 'departments', label: 'Отделы', icon: 'business-outline', iconColor: '#e944d6ff', minRole: 'admin' },
      { id: 'users', label: 'Пользователи', icon: 'people-outline', iconColor: '#e99444ff', minRole: 'admin' },
      { id: 'user-groups', label: 'Группы', icon: 'people-circle-outline', iconColor: '#10B981', minRole: 'department_head' },
    ],
  },
];

export const AdminSidebarNavigation: React.FC<AdminSidebarNavigationProps> = ({
  activeSection,
  onSectionChange,
  userRole,
  width: sidebarWidth,
}) => {
  const { theme, isDark } = useTheme();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: isDark ? theme.card : '#FFFFFF',
      borderWidth: 1,
      borderColor: theme.border,
    },
    scrollContent: {
      paddingTop: 12,
      paddingBottom: 12,
    },
    groupContainer: {
      marginBottom: 20,
    },
    groupTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textTertiary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      letterSpacing: 0.5,
    },
    itemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginHorizontal: 8,
      borderRadius: 8,
    },
    itemButtonActive: {
      backgroundColor: theme.primary,
    },
    iconContainer: {
      width: 28,
      height: 28,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    itemText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
      flex: 1,
    },
    itemTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });

  const renderItem = (item: SidebarItem) => {
    const isActive = activeSection === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          dynamicStyles.itemButton,
          isActive && dynamicStyles.itemButtonActive,
        ]}
        onPress={() => onSectionChange(item.id)}
        activeOpacity={0.7}
      >
        <View style={[
          dynamicStyles.iconContainer,
          { backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent' }
        ]}>
          <Ionicons
            name={item.icon}
            size={18}
            color={isActive ? '#FFFFFF' : item.iconColor}
          />
        </View>
        <Text style={[
          dynamicStyles.itemText,
          isActive && dynamicStyles.itemTextActive,
        ]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderGroup = (group: SidebarGroup) => {
    const visibleItems = group.items.filter(item => {
      if (item.minRole === 'admin') return isAdmin;
      return true;
    });

    if (visibleItems.length === 0) return null;

    return (
      <View key={group.title} style={dynamicStyles.groupContainer}>
        <Text style={dynamicStyles.groupTitle}>{group.title}</Text>
        {visibleItems.map(renderItem)}
      </View>
    );
  };

  return (
    <View style={[styles.container, dynamicStyles.container, sidebarWidth ? { width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth } : undefined]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {ADMIN_SIDEBAR_STRUCTURE.map(renderGroup)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    minWidth: 240,
    maxWidth: 320,
    borderRadius: 16,
    margin: 16,
    marginRight: 0,
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
  scrollView: {
    flex: 1,
  },
});
