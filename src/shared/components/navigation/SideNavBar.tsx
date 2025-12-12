/**
 * Side Navigation Bar
 * Боковой навбар для широких экранов (desktop/tablet landscape)
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { Avatar } from '@shared/components/common/Avatar';

interface NavItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  adminOnly?: boolean;
}

interface SideNavBarProps {
  activeRoute: string;
  onNavigate: (route: string) => void;
  totalUnreadCount?: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Tasks',
    label: 'Задачи',
    icon: 'checkbox-outline',
    iconFocused: 'checkbox',
  },
  {
    name: 'Polls',
    label: 'Опросы',
    icon: 'bar-chart-outline',
    iconFocused: 'bar-chart',
  },
  {
    name: 'Chats',
    label: 'Чаты',
    icon: 'chatbubbles-outline',
    iconFocused: 'chatbubbles',
  },
  {
    name: 'Calendar',
    label: 'События',
    icon: 'calendar-outline',
    iconFocused: 'calendar',
  },
  {
    name: 'Admin',
    label: 'Админка',
    icon: 'shield-outline',
    iconFocused: 'shield',
    adminOnly: true,
  },
  {
    name: 'Profile',
    label: 'Настройки',
    icon: 'settings-outline',
    iconFocused: 'settings',
  },
];

export const SideNavBar: React.FC<SideNavBarProps> = ({
  activeRoute,
  onNavigate,
  totalUnreadCount = 0,
}) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();

  // Check if user is admin or super_admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Filter items based on admin status
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly) {
      return isAdmin;
    }
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary, borderRightColor: theme.border }]}>
      {/* Navigation Items */}
      {visibleItems.map((item) => {
        const isActive = activeRoute === item.name;
        const showBadge = item.name === 'Chats' && totalUnreadCount > 0;

        return (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.navItem,
              isActive && { backgroundColor: theme.primaryLight || theme.primary + '20' },
            ]}
            onPress={() => onNavigate(item.name)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={isActive ? item.iconFocused : item.icon}
                size={24}
                color={isActive ? theme.primary : theme.textTertiary}
              />
              {showBadge && (
                <View style={[styles.badge, { backgroundColor: theme.error || '#FF3B30', borderColor: theme.backgroundSecondary }]}>
                  <Text style={styles.badgeText}>
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                { color: isActive ? theme.primary : theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* User Avatar at bottom */}
      {user && (
        <View style={styles.avatarContainer}>
          <Avatar
            imageUrl={user.avatar}
            thumbnailUrl={user.avatar_thumbnail}
            name={user.name || user.email}
            size={40}
            userId={user.id}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 80,
    paddingVertical: 12,
    borderRightWidth: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 'auto',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
  },
  iconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
