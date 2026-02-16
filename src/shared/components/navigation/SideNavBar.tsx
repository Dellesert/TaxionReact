/**
 * Side Navigation Bar
 * Боковой навбар для широких экранов (desktop/tablet landscape)
 * Поддерживает сложенный (только иконки) и расширенный (иконка + название) режимы
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useNotificationStore } from '@shared/store/notificationStore';
import { Avatar } from '@shared/components/common/Avatar';
import { AccountSwitcherModal } from '@shared/components/account/AccountSwitcherModal';
import { useSidebar } from '@shared/contexts/SidebarContext';
import { useTitleBarSearch } from '@shared/contexts/TitleBarSearchContext';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import * as accountManager from '@services/accountManager';
import { websocketService } from '@services/websocket.service';
import { clearAllStorages } from '@shared/storage';
import { clearSyncMetadata } from '@shared/storage/syncMetadata';
import { useChatStore } from '@shared/store/chatStore';
import { useTaskStore } from '@shared/store/taskStore';
import { usePollStore } from '@shared/store/pollStore';
import { useCalendarStore } from '@shared/store/calendarStore';
import { useUserStore } from '@shared/store/userStore';

interface NavItem {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  minRole?: 'department_head' | 'admin' | 'super_admin';
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
    label: 'Администрирование',
    icon: 'shield-outline',
    iconFocused: 'shield',
    minRole: 'department_head',
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
  const unreadNotificationCount = useNotificationStore((state) => state.unreadCount);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const { isCollapsed } = useSidebar();
  const { searchQuery, isVisible: isSearchVisible, setSearchQuery, clearSearch } = useTitleBarSearch();

  // Check if user is admin or super_admin
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isDepartmentHeadOrAbove = isAdmin || user?.role === 'department_head';

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

  /**
   * Add account: save current session, clear stores, show login screen.
   * Current session stays alive on the server.
   */
  const handleAddAccount = async () => {
    const currentUser = useAuthStore.getState().user;
    const currentSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);

    // Save current account
    if (currentUser && currentSessionId) {
      await accountManager.saveAccountAfterLogin(currentUser, currentSessionId);
    }

    // Disconnect WS
    websocketService.disconnect();

    // Clear all in-memory stores
    useChatStore.getState().set({
      chats: [],
      tabs: {
        all: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
        private: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
        group: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
        favorite: { pinnedChats: [], regularChats: [], offset: 0, hasMore: true, loaded: false },
      },
      messages: {},
      totalUnreadCount: 0,
    });
    useTaskStore.getState().clearCache();
    usePollStore.getState().clearCache();
    useCalendarStore.getState().clearCache();
    useUserStore.getState().clearCache();
    await clearAllStorages();
    await clearSyncMetadata();

    // Clear legacy keys so Auth screen shows
    await secureStorage.deleteItemAsync(STORAGE_KEYS.SESSION_ID);
    await secureStorage.deleteItemAsync(STORAGE_KEYS.USER_DATA);

    // Set auth to unauthenticated -> shows Login screen
    useAuthStore.setState({
      user: null,
      sessionId: null,
      isAuthenticated: false,
    });
  };

  // Filter items based on admin status and Electron environment
  const visibleItems = NAV_ITEMS.filter(item => {
    // Скрываем уведомления в Electron (они в titlebar)
    if (item.name === 'Notifications' && isElectron) {
      return false;
    }
    // Показываем пункты по минимальной роли
    if (item.minRole === 'admin' || item.minRole === 'super_admin') {
      return isAdmin;
    }
    if (item.minRole === 'department_head') {
      return isDepartmentHeadOrAbove;
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
              style={[styles.searchInput, { color: theme.text, outlineStyle: 'none' } as any]}
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

      {/* Divider above user avatar */}
      {user && (
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
      )}

      {/* User Avatar at bottom */}
      {user && (
        <TouchableOpacity
          style={[
            styles.avatarContainer,
            isCollapsed ? styles.avatarContainerCollapsed : styles.avatarContainerExpanded,
          ]}
          onPress={() => setShowAccountSwitcher(true)}
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

      {/* Account Switcher Modal */}
      <AccountSwitcherModal
        visible={showAccountSwitcher}
        onClose={() => setShowAccountSwitcher(false)}
        onAddAccount={handleAddAccount}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRightWidth: 1,
    borderBottomRightRadius: 16,
    position: 'relative',
    // Shadow for visual separation
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
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
    paddingHorizontal: 8,
    borderWidth: 1,
    gap: 6,
    overflow: 'hidden',
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    height: 32,
    padding: 0,
  },
  clearButton: {
    padding: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 0,
    marginTop: 'auto',
  },
  avatarContainer: {
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
});
