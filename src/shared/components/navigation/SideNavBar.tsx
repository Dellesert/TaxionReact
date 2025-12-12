/**
 * Side Navigation Bar
 * Боковой навбар для широких экранов (desktop/tablet landscape)
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Pressable } from 'react-native';
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
  const { user, logout } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check if user is admin or super_admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

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
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatarBorder, { borderColor: theme.primary }]}>
            <Avatar
              imageUrl={user.avatar}
              thumbnailUrl={user.avatar_thumbnail}
              name={user.name || user.email}
              size={38}
              userId={user.id}
            />
          </View>
        </TouchableOpacity>
      )}

      {/* Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLogoutModal(false)}
        >
          <View
            style={[styles.modalContent, { backgroundColor: theme.card }]}
            onStartShouldSetResponder={() => true}
          >
            {/* User Info */}
            <View style={styles.modalHeader}>
              <Avatar
                imageUrl={user?.avatar}
                thumbnailUrl={user?.avatar_thumbnail}
                name={user?.name || user?.email || ''}
                size={56}
                userId={user?.id || 0}
              />
              <Text style={[styles.modalUserName, { color: theme.text }]}>
                {user?.name || user?.email}
              </Text>
              {user?.email && user?.name && (
                <Text style={[styles.modalUserEmail, { color: theme.textSecondary }]}>
                  {user.email}
                </Text>
              )}
            </View>

            {/* Logout Button */}
            <TouchableOpacity
              style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
              onPress={handleLogout}
              disabled={isLoggingOut}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text style={styles.logoutButtonText}>
                {isLoggingOut ? 'Выход...' : 'Выйти'}
              </Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => setShowLogoutModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                Отмена
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
  avatarBorder: {
    borderWidth: 2,
    borderRadius: 22,
    padding: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: 320,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalUserName: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  modalUserEmail: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
