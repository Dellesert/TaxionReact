/**
 * Custom TitleBar Component
 * Кастомный заголовок окна для Electron приложения
 */

import React, { useState, useRef, useContext } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { useThemeStore } from '@shared/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { useTitleBarControls } from '@shared/contexts/TitleBarControlsContext';
import { useSidebar } from '@shared/contexts/SidebarContext';
import { useNotificationStore } from '@shared/store/notificationStore';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { DesktopNavigationContext } from '@shared/contexts/DesktopNavigationContext';
import { TitleBarNotificationDropdown } from './TitleBarNotificationDropdown';

interface CustomTitleBarProps {
  navigationRef?: React.RefObject<NavigationContainerRef<any>>;
}

export const CustomTitleBar: React.FC<CustomTitleBarProps> = ({
  navigationRef
}) => {
  const isWideScreen = useIsWideScreen();
  const desktopNav = useContext(DesktopNavigationContext);

  const theme = useThemeStore((state) => state.theme);
  const [hoveredButton, setHoveredButton] = useState<'minimize' | 'maximize' | 'close' | null>(null);
  const { pageTitle, leftControls, rightControls } = useTitleBarControls();
  const { sidebarWidth, isCollapsed, toggleCollapsed } = useSidebar();
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

  return (
    <View style={[styles.titleBar, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
      {/* Draggable area - Left side with page title (aligned with sidebar) */}
      <View style={[styles.dragArea, { width: sidebarWidth, borderRightWidth: 1, borderRightColor: theme.border }]}>
        {!isCollapsed && pageTitle ? (
          <Text style={[styles.pageTitle, { color: theme.text }]} numberOfLines={1}>
            {pageTitle}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View
          style={styles.toggleButton}
          // @ts-ignore - Web-only event handlers
          onClick={toggleCollapsed}
          onMouseEnter={(e: any) => {
            if (e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
            }
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Ionicons
            name={isCollapsed ? 'chevron-forward' : 'chevron-back'}
            size={16}
            color={theme.textSecondary}
          />
        </View>
      </View>

      {/* Left Controls from context */}
      {leftControls && (
        <View style={styles.leftControlsContainer}>
          {leftControls}
        </View>
      )}

      {/* Spacer for flex layout */}
      <View style={{ flex: 1 }} />

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
    //borderBottomWidth: 1,
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
    paddingLeft: 16,
    paddingRight: 8,
    flexShrink: 0,
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'drag',
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  toggleButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    // @ts-ignore - Web-only styles
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    WebkitAppRegion: 'no-drag',
  },
  leftControlsContainer: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 16,
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'no-drag',
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
