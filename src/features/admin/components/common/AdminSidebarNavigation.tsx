/**
 * Admin Sidebar Navigation
 * macOS-style sidebar navigation для раздела администрирования
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { UserRole } from '@/types/user.types';

export type AdminSection = 'analytics' | 'departments' | 'users' | 'user-groups';

interface SidebarItem {
  id: AdminSection;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  description: string;
  minRole: 'department_head' | 'admin';
}

interface AdminSidebarNavigationProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  userRole?: UserRole;
  width?: number;
}

const ADMIN_SECTIONS: SidebarItem[] = [
  {
    id: 'analytics',
    label: 'Аналитика',
    icon: 'bar-chart-outline',
    iconColor: '#3B82F6',
    description: 'Статистика и метрики системы',
    minRole: 'admin',
  },
  {
    id: 'departments',
    label: 'Отделы',
    icon: 'business-outline',
    iconColor: '#e944d6ff',
    description: 'Управление структурой организации',
    minRole: 'admin',
  },
  {
    id: 'users',
    label: 'Пользователи',
    icon: 'people-outline',
    iconColor: '#e99444ff',
    description: 'Управление пользователями системы',
    minRole: 'admin',
  },
  {
    id: 'user-groups',
    label: 'Группы',
    icon: 'people-circle-outline',
    iconColor: '#10B981',
    description: 'Управление группами пользователей',
    minRole: 'department_head',
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

  const visibleSections = ADMIN_SECTIONS.filter(item => {
    if (item.minRole === 'admin') return isAdmin;
    return true; // department_head and above can see department_head items
  });

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: isDark ? theme.card : '#FFFFFF',
      borderRightWidth: 1,
      borderRightColor: theme.border,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    headerContainer: {
      paddingHorizontal: 20,
      paddingTop: 40,
      paddingBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginBottom: 16,
      backgroundColor: isDark ? theme.card : '#FFFFFF',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    itemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginHorizontal: 12,
      borderRadius: 12,
      marginBottom: 8,
    },
    itemButtonActive: {
      backgroundColor: theme.primary,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    itemButtonHover: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    itemContentContainer: {
      flex: 1,
    },
    itemLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    itemLabelActive: {
      color: '#FFFFFF',
    },
    itemDescription: {
      fontSize: 12,
      color: theme.textTertiary,
      lineHeight: 16,
    },
    itemDescriptionActive: {
      color: 'rgba(255, 255, 255, 0.8)',
    },
    chevronIcon: {
      opacity: 0.4,
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
        <View
          style={[
            dynamicStyles.iconContainer,
            {
              backgroundColor: isActive
                ? 'rgba(255, 255, 255, 0.2)'
                : isDark
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.04)',
            },
          ]}
        >
          <Ionicons
            name={item.icon}
            size={22}
            color={isActive ? '#FFFFFF' : item.iconColor}
          />
        </View>
        <View style={dynamicStyles.itemContentContainer}>
          <Text
            style={[
              dynamicStyles.itemLabel,
              isActive && dynamicStyles.itemLabelActive,
            ]}
          >
            {item.label}
          </Text>
          <Text
            style={[
              dynamicStyles.itemDescription,
              isActive && dynamicStyles.itemDescriptionActive,
            ]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isActive ? '#FFFFFF' : theme.textTertiary}
          style={dynamicStyles.chevronIcon}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, dynamicStyles.container, sidebarWidth ? { width: sidebarWidth, minWidth: sidebarWidth, maxWidth: sidebarWidth } : undefined]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        

        {/* Navigation Items */}
        {visibleSections.map(renderItem)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 320,
    minWidth: 280,
    maxWidth: 360,
    paddingTop: 26,
  },
  scrollView: {
    flex: 1,
  },
});
