/**
 * Side Navigation Bar
 * Боковой навбар для широких экранов (desktop/tablet landscape)
 * Поддерживает сложенный (только иконки) и расширенный (иконка + название) режимы
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, TextInput, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotificationStore } from '@shared/store/notificationStore';
import { Avatar } from '@shared/components/common/Avatar';
import { useSidebar } from '@shared/contexts/SidebarContext';
import { useTitleBarSearch } from '@shared/contexts/TitleBarSearchContext';

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
    label: 'Календарь',
    icon: 'calendar-outline',
    iconFocused: 'calendar',
  },
  {
    name: 'Schedules',
    label: 'Графики',
    icon: 'time-outline',
    iconFocused: 'time',
  },
  {
    name: 'Absences',
    label: 'Нерабочие дни',
    icon: 'calendar-clear-outline',
    iconFocused: 'calendar-clear',
  },
  {
    name: 'Notifications',
    label: 'Уведомления',
    icon: 'notifications-outline',
    iconFocused: 'notifications',
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
  const unreadNotificationCount = useNotificationStore((state) => state.unreadCount);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { isCollapsed } = useSidebar();
  const { searchQuery, isVisible: isSearchVisible, setSearchQuery, clearSearch } = useTitleBarSearch();

  // Check if user is admin or super_admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

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

  // Filter items based on admin status and Electron environment
  const visibleItems = NAV_ITEMS.filter(item => {
    // Скрываем уведомления в Electron (они в titlebar)
    if (item.name === 'Notifications' && isElectron) {
      return false;
    }
    // Показываем админку только админам
    if (item.adminOnly) {
      return isAdmin;
    }
    return true;
  });

  return (
    <View style={[
      styles.container,
      isCollapsed ? styles.containerCollapsed : styles.containerExpanded,
      {
        backgroundColor: theme.backgroundSecondary,
        borderRightColor: theme.border,
      }
    ]}>
      {/* Search - always render container when expanded to prevent layout shift */}
      {!isCollapsed && (
        <View style={[styles.searchContainer, !isSearchVisible && styles.searchContainerHidden]}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
            <Ionicons name="search" size={16} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Поиск..."
              placeholderTextColor={theme.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={isSearchVisible}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                <Ionicons name="close-circle" size={14} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Navigation Items */}
      {visibleItems.map((item) => {
        const isActive = activeRoute === item.name;
        const showChatBadge = item.name === 'Chats' && totalUnreadCount > 0;
        const showNotificationBadge = item.name === 'Notifications' && unreadNotificationCount > 0;
        const badgeCount = item.name === 'Chats' ? totalUnreadCount : unreadNotificationCount;

        return (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.navItem,
              isCollapsed ? styles.navItemCollapsed : styles.navItemExpanded,
              isActive && { backgroundColor: theme.primaryLight || theme.primary + '20' },
            ]}
            onPress={() => onNavigate(item.name)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, !isCollapsed && styles.iconContainerExpanded]}>
              <Ionicons
                name={isActive ? item.iconFocused : item.icon}
                size={24}
                color={isActive ? theme.primary : theme.textTertiary}
              />
              {isCollapsed && (showChatBadge || showNotificationBadge) && (
                <View style={[styles.badge, { backgroundColor: theme.error || '#FF3B30', borderColor: theme.backgroundSecondary }]}>
                  <Text style={styles.badgeText}>
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </Text>
                </View>
              )}
            </View>
            {!isCollapsed && (
              <>
                <Text
                  style={[
                    styles.labelExpanded,
                    { color: isActive ? theme.primary : theme.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {(showChatBadge || showNotificationBadge) && (
                  <View style={[styles.badgeExpanded, { backgroundColor: theme.error || '#FF3B30' }]}>
                    <Text style={styles.badgeText}>
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </Text>
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        );
      })}

      {/* User Avatar at bottom */}
      {user && (
        <TouchableOpacity
          style={[
            styles.avatarContainer,
            isCollapsed ? styles.avatarContainerCollapsed : styles.avatarContainerExpanded,
          ]}
          onPress={() => setShowLogoutModal(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.avatarBorder, { borderColor: theme.primary }]}>
            <Avatar
              imageUrl={user.avatar}
              thumbnailUrl={user.avatar_thumbnail}
              name={user.name || user.email}
              size={isCollapsed ? 38 : 32}
              userId={user.id}
            />
          </View>
          {!isCollapsed && (
            <Text
              style={[styles.avatarName, { color: theme.text }]}
              numberOfLines={1}
            >
              {user.name || user.email}
            </Text>
          )}
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
    borderRightWidth: 1,
    position: 'relative',
  },
  containerCollapsed: {
    width: 72,
    paddingTop: 8,
  },
  containerExpanded: {
    width: 240,
    paddingTop: 8,
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  searchContainerHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },
  searchContainerCollapsed: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 32,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    flexShrink: 0,
  },
  avatarContainer: {
    marginTop: 'auto',
    marginHorizontal: 8,
    borderRadius: 12,
  },
  avatarContainerCollapsed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  avatarContainerExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  avatarBorder: {
    borderWidth: 2,
    borderRadius: 20,
    padding: 2,
  },
  avatarName: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  navItem: {
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
  },
  navItemCollapsed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  navItemExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  iconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerExpanded: {
    marginRight: 12,
  },
  labelExpanded: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
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
  badgeExpanded: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
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
