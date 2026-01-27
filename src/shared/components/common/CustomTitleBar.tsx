/**
 * Custom TitleBar Component
 * Кастомный заголовок окна для Electron приложения
 */

import React, { useState, useRef, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { NavigationContainerRef } from '@react-navigation/native';
import { useThemeStore } from '@shared/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { useTitleBarSearch } from '@shared/contexts/TitleBarSearchContext';
import { useTitleBarControls } from '@shared/contexts/TitleBarControlsContext';
import { useSidebar } from '@shared/contexts/SidebarContext';
import { useNotificationStore } from '@shared/store/notificationStore';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { DesktopNavigationContext } from '@shared/contexts/DesktopNavigationContext';
import { TitleBarNotificationDropdown } from './TitleBarNotificationDropdown';

interface CustomTitleBarProps {
  title?: string;
  navigationRef?: React.RefObject<NavigationContainerRef<any>>;
}

export const CustomTitleBar: React.FC<CustomTitleBarProps> = ({
  title = 'Тахион',
  navigationRef
}) => {
  const isWideScreen = useIsWideScreen();
  const desktopNav = useContext(DesktopNavigationContext);

  const theme = useThemeStore((state) => state.theme);
  const [hoveredButton, setHoveredButton] = useState<'minimize' | 'maximize' | 'close' | null>(null);
  const { searchQuery, placeholder, isVisible, setSearchQuery, clearSearch } = useTitleBarSearch();
  const { pageTitle, leftControls, rightControls } = useTitleBarControls();
  const { sidebarWidth } = useSidebar();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const [notificationDropdownVisible, setNotificationDropdownVisible] = useState(false);
  const [notificationIconPosition, setNotificationIconPosition] = useState({ x: 0, y: 0 });
  const bellButtonRef = useRef<View>(null);

  // Показываем только в Electron (не в обычном браузере)
  if (Platform.OS !== 'web' || !window.electron) {
    return null;
  }

  const handleMinimize = () => {
    if (window.electron?.minimize) {
      window.electron.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electron?.maximize) {
      window.electron.maximize();
    }
  };

  const handleClose = () => {
    if (window.electron?.close) {
      window.electron.close();
    }
  };

  const getButtonStyle = (buttonType: 'minimize' | 'maximize' | 'close') => {
    if (hoveredButton !== buttonType) return {};

    if (buttonType === 'close') {
      return { backgroundColor: '#E81123' };
    }
    return { backgroundColor: theme.border };
  };

  const handleNotificationClick = () => {
    // Переключаем видимость
    setNotificationDropdownVisible(!notificationDropdownVisible);

    // Получаем позицию иконки колокольчика для web
    if (Platform.OS === 'web' && bellButtonRef.current) {
      try {
        // @ts-ignore - Web-only method
        const element = bellButtonRef.current;
        // @ts-ignore
        const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;

        if (rect) {
          setNotificationIconPosition({
            x: rect.left,
            y: rect.bottom,
          });
        }
      } catch (error) {
        console.error('[TitleBar] Error getting bell position:', error);
      }
    }
  };

  // Используем заголовок страницы, если он установлен
  const displayTitle = pageTitle || title;

  return (
    <View style={[styles.titleBar, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
      {/* Draggable area - Left side with title */}
      <View style={styles.dragArea}>
        <View style={styles.titleContainer}>
          
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{displayTitle}</Text>
        </View>
      </View>

      {/* Left Controls from context */}
      {leftControls && (
        <View style={[styles.leftControlsContainer, { paddingLeft: Math.max(0, sidebarWidth - 120) }]}>
          {leftControls}
        </View>
      )}

      {/* Spacer for flex layout */}
      <View style={{ flex: 1 }} />

      {/* Center - Search (если visible) - absolute positioned */}
      {isVisible && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
            <Ionicons name="search" size={14} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder={placeholder}
              placeholderTextColor={theme.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
              // @ts-ignore - Web-only styles
              onFocus={(e) => {
                // @ts-ignore
                e.target.style.outline = 'none';
              }}
            />
            {searchQuery.length > 0 && (
              <View
                style={styles.clearButton}
                // @ts-ignore - Web-only event handlers
                onClick={clearSearch}
                onMouseEnter={(e) => {
                  // @ts-ignore
                  e.currentTarget.style.opacity = '0.7';
                }}
                onMouseLeave={(e) => {
                  // @ts-ignore
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <Ionicons name="close-circle" size={12} color={theme.textSecondary} />
              </View>
            )}
          </View>
        </View>
      )}

      {/* Right Controls from context */}
      {rightControls && (
        <View style={styles.rightControlsContainer}>
          {rightControls}
        </View>
      )}

      {/* Notification Bell - Before window controls */}
      <View
        // @ts-ignore - ref type
        ref={bellButtonRef}
        style={styles.notificationBellContainer}
      >
        <View
          style={styles.notificationBell}
          // @ts-ignore - Web-only event handlers
          onClick={handleNotificationClick}
          onMouseEnter={(e: any) => {
            if (e.currentTarget && e.currentTarget.style) {
              e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
            }
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget && e.currentTarget.style) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Ionicons
            name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
            size={16}
            color={theme.text}
          />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Window controls */}
      <View style={styles.controls}>
        <View
          style={[styles.controlButton, getButtonStyle('minimize')]}
          // @ts-ignore - Web-only event handlers
          onClick={handleMinimize}
          onMouseEnter={() => setHoveredButton('minimize')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <Ionicons name="remove" size={14} color={hoveredButton === 'close' && hoveredButton === 'close' ? '#FFFFFF' : theme.text} />
        </View>

        <View
          style={[styles.controlButton, getButtonStyle('maximize')]}
          // @ts-ignore - Web-only event handlers
          onClick={handleMaximize}
          onMouseEnter={() => setHoveredButton('maximize')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <Ionicons name="square-outline" size={12} color={hoveredButton === 'close' && hoveredButton === 'close' ? '#FFFFFF' : theme.text} />
        </View>

        <View
          style={[styles.controlButton, getButtonStyle('close')]}
          // @ts-ignore - Web-only event handlers
          onClick={handleClose}
          onMouseEnter={() => setHoveredButton('close')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <Ionicons name="close" size={14} color={hoveredButton === 'close' ? '#FFFFFF' : theme.text} />
        </View>
      </View>

      {/* Notification Dropdown */}
      <TitleBarNotificationDropdown
        visible={notificationDropdownVisible}
        onClose={() => setNotificationDropdownVisible(false)}
        anchorPosition={notificationIconPosition}
        navigationRef={navigationRef}
        isWideScreen={isWideScreen}
        desktopNavigateToTab={desktopNav?.navigateToTab}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  titleBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'no-drag',
    userSelect: 'none',
    zIndex: 100,
    position: 'relative',
  },
  dragArea: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    flexShrink: 0,
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'drag',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    maxWidth: 150,
  },
  leftControlsContainer: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'no-drag',
  },
  searchContainer: {
    position: 'absolute',
    left: '50%',
    // @ts-ignore - Web-only styles
    transform: 'translateX(-50%)',
    width: 240,
    maxWidth: 240,
    minWidth: 200,
    WebkitAppRegion: 'no-drag',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    borderRadius: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 4,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    height: 24,
    padding: 0,
    // @ts-ignore - Web-only styles
    outlineStyle: 'none',
  },
  clearButton: {
    padding: 2,
    flexShrink: 0,
    // @ts-ignore - Web-only styles
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  rightControlsContainer: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    flexShrink: 0,
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'no-drag',
  },
  notificationBellContainer: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 4,
    flexShrink: 0,
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'no-drag',
  },
  notificationBell: {
    position: 'relative',
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore - Web-only styles
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    lineHeight: 10,
  },
  controls: {
    flexDirection: 'row',
    height: '100%',
    flexShrink: 0,
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'no-drag',
  },
  controlButton: {
    width: 40,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore - Web-only styles
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
});
