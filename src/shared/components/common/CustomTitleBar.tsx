/**
 * Custom TitleBar Component
 * Кастомный заголовок окна для Electron приложения
 */

import React, { useState, useRef, useContext } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { NavigationContainerRef } from '@react-navigation/native';
import { useThemeStore } from '@shared/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { useTitleBarSearch } from '@shared/contexts/TitleBarSearchContext';
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

  console.log('[CustomTitleBar] Context:', {
    isWideScreen,
    hasDesktopNav: !!desktopNav,
    hasNavigateToTab: !!desktopNav?.navigateToTab
  });

  const theme = useThemeStore((state) => state.theme);
  const [hoveredButton, setHoveredButton] = useState<'minimize' | 'maximize' | 'close' | null>(null);
  const { searchQuery, placeholder, isVisible, setSearchQuery, clearSearch } = useTitleBarSearch();
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
      {/* Draggable area - Left side */}
      <View style={styles.dragArea}>
        <View style={styles.titleContainer}>
          <Image
            source={require('../../../../assets/images/icon.png')}
            style={styles.appIcon}
            contentFit="cover"
          />
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        </View>
      </View>

      {/* Spacer for flex layout */}
      <View style={{ flex: 1 }} />

      {/* Center - Search (если visible) - absolute positioned */}
      {isVisible && (
        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.input, borderColor: theme.inputBorder }]}>
            <Ionicons name="search" size={16} color={theme.textSecondary} style={styles.searchIcon} />
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
                <Ionicons name="close-circle" size={14} color={theme.textSecondary} />
              </View>
            )}
          </View>
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
            size={18}
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
          <Ionicons name="remove" size={16} color={hoveredButton === 'close' && hoveredButton === 'close' ? '#FFFFFF' : theme.text} />
        </View>

        <View
          style={[styles.controlButton, getButtonStyle('maximize')]}
          // @ts-ignore - Web-only event handlers
          onClick={handleMaximize}
          onMouseEnter={() => setHoveredButton('maximize')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <Ionicons name="square-outline" size={14} color={hoveredButton === 'close' && hoveredButton === 'close' ? '#FFFFFF' : theme.text} />
        </View>

        <View
          style={[styles.controlButton, getButtonStyle('close')]}
          // @ts-ignore - Web-only event handlers
          onClick={handleClose}
          onMouseEnter={() => setHoveredButton('close')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          <Ionicons name="close" size={16} color={hoveredButton === 'close' ? '#FFFFFF' : theme.text} />
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
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'no-drag',
    userSelect: 'none',
  },
  dragArea: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    flexShrink: 0,
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'drag',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
  },
  searchContainer: {
    position: 'absolute',
    left: '50%',
    // @ts-ignore - Web-only styles
    transform: 'translateX(-50%)',
    width: 300,
    maxWidth: 300,
    minWidth: 250,
    WebkitAppRegion: 'no-drag',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 6,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: 28,
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
  notificationBellContainer: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
    flexShrink: 0,
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'no-drag',
  },
  notificationBell: {
    position: 'relative',
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore - Web-only styles
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
  controls: {
    flexDirection: 'row',
    height: '100%',
    flexShrink: 0,
    // @ts-ignore - Web-only styles
    WebkitAppRegion: 'no-drag',
  },
  controlButton: {
    width: 46,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore - Web-only styles
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
});
