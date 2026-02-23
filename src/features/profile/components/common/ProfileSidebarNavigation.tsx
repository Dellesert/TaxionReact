/**
 * Profile Sidebar Navigation
 * macOS-style sidebar navigation для настроек профиля
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { User } from '@/types/user.types';

export type ProfileSection =
  | 'accounts'
  | 'profile'
  | 'change-password'
  | 'active-sessions'
  | 'passkey'
  | 'notifications'
  | 'theme'
  | 'zoom'
  | 'tray'
  | 'animations'
  | 'storage'
  | 'about';

interface SidebarItem {
  id: ProfileSection;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

interface ProfileSidebarNavigationProps {
  activeSection: ProfileSection;
  onSectionChange: (section: ProfileSection) => void;
  user: User | null;
  onLogout: () => void;
  isLoggingOut: boolean;
}

const isElectronApp = Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).electron?.isElectron;

const getSidebarStructure = (): SidebarGroup[] => {
  return [
    {
      title: 'АККАУНТЫ',
      items: [
        { id: 'accounts', label: 'Управление аккаунтами', icon: 'people-outline', iconColor: '#6366F1' },
      ],
    },
    {
      title: 'ПРОФИЛЬ',
      items: [
        { id: 'profile', label: 'Общие настройки', icon: 'person-outline', iconColor: '#3B82F6' },
      ],
    },
    {
      title: 'БЕЗОПАСНОСТЬ',
      items: [
        { id: 'change-password', label: 'Пароль', icon: 'lock-closed-outline', iconColor: '#F59E0B' },
        { id: 'active-sessions', label: 'Устройства', icon: 'phone-portrait-outline', iconColor: '#44e9a2ff' },
        ...(!isElectronApp ? [{ id: 'passkey' as ProfileSection, label: 'Ключ входа', icon: 'key-outline' as keyof typeof Ionicons.glyphMap, iconColor: '#6366F1' }] : []),
      ],
    },
    {
      title: 'НАСТРОЙКИ',
      items: [
        { id: 'notifications', label: 'Уведомления', icon: 'notifications-outline', iconColor: '#E94444' },
        { id: 'theme', label: 'Тема оформления', icon: 'color-palette-outline', iconColor: '#44aae9ff' },
        ...(isElectronApp ? [{ id: 'zoom' as ProfileSection, label: 'Масштаб', icon: 'resize-outline' as keyof typeof Ionicons.glyphMap, iconColor: '#6366F1' }] : []),
        { id: 'tray', label: 'Системный трей', icon: 'apps-outline', iconColor: '#8B5CF6' },
        ...(isElectronApp ? [{ id: 'animations' as ProfileSection, label: 'Быстродействие', icon: 'flash-outline' as keyof typeof Ionicons.glyphMap, iconColor: '#F59E0B' }] : []),
        { id: 'storage', label: 'Данные и память', icon: 'server-outline', iconColor: '#10B981' },
        { id: 'about', label: 'О приложении', icon: 'information-circle-outline', iconColor: '#3ed6ccff' },
      ],
    },
  ];
};

export const ProfileSidebarNavigation: React.FC<ProfileSidebarNavigationProps> = ({
  activeSection,
  onSectionChange,
  user,
  onLogout,
  isLoggingOut,
}) => {
  const { theme, isDark } = useTheme();

  const sidebarStructure = getSidebarStructure();

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
    itemButtonHover: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
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
    logoutContainer: {
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: 'auto',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
    },
    logoutButtonDisabled: {
      opacity: 0.6,
    },
    logoutIcon: {
      marginRight: 12,
    },
    logoutText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#EF4444',
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

  const renderGroup = (group: SidebarGroup) => (
    <View key={group.title} style={dynamicStyles.groupContainer}>
      <Text style={dynamicStyles.groupTitle}>{group.title}</Text>
      {group.items.map(renderItem)}
    </View>
  );

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sidebarStructure.map(renderGroup)}
      </ScrollView>

      {/* Logout Button */}
      <View style={dynamicStyles.logoutContainer}>
        <TouchableOpacity
          style={[
            dynamicStyles.logoutButton,
            isLoggingOut && dynamicStyles.logoutButtonDisabled,
          ]}
          onPress={onLogout}
          disabled={isLoggingOut}
          activeOpacity={0.7}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#EF4444"
            style={dynamicStyles.logoutIcon}
          />
          <Text style={dynamicStyles.logoutText}>
            {isLoggingOut ? 'Выход...' : 'Выйти'}
          </Text>
        </TouchableOpacity>
      </View>
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
