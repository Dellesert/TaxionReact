/**
 * Custom TitleBar Component
 * Кастомный заголовок окна для Electron приложения
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useThemeStore } from '@shared/store/themeStore';
import { Ionicons } from '@expo/vector-icons';

interface CustomTitleBarProps {
  title?: string;
}

export const CustomTitleBar: React.FC<CustomTitleBarProps> = ({
  title = 'Tachyon Messenger'
}) => {
  const theme = useThemeStore((state) => state.theme);
  const [hoveredButton, setHoveredButton] = useState<'minimize' | 'maximize' | 'close' | null>(null);

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
      {/* Draggable area */}
      <View style={styles.dragArea}>
        <View style={styles.titleContainer}>
          <View style={[styles.appIcon, { backgroundColor: theme.primary }]}>
            <Text style={styles.appIconText}>T</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
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
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
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
  controls: {
    flexDirection: 'row',
    height: '100%',
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
