/**
 * Custom TitleBar Component
 * Кастомный заголовок окна для Electron приложения
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useThemeStore } from '@shared/store/themeStore';
import { Ionicons } from '@expo/vector-icons';
import { useTitleBarSearch } from '@shared/contexts/TitleBarSearchContext';

interface CustomTitleBarProps {
  title?: string;
}

export const CustomTitleBar: React.FC<CustomTitleBarProps> = ({
  title = 'Tachyon Messenger'
}) => {
  const theme = useThemeStore((state) => state.theme);
  const [hoveredButton, setHoveredButton] = useState<'minimize' | 'maximize' | 'close' | null>(null);
  const { searchQuery, placeholder, isVisible, setSearchQuery, clearSearch } = useTitleBarSearch();

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

  return (
    <View style={[styles.titleBar, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
      {/* Draggable area - Left side */}
      <View style={styles.dragArea}>
        <View style={styles.titleContainer}>
          <View style={[styles.appIcon, { backgroundColor: theme.primary }]}>
            <Text style={styles.appIconText}>T</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        </View>
      </View>

      {/* Center - Search (если visible) */}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
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
    width: 400,
    maxWidth: 400,
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
