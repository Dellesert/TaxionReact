import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationBell } from '@shared/components/common/NotificationBell';
import { ConnectionStatus } from '@shared/components/common/ConnectionStatus';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useAnimationStore } from '@shared/store/animationStore';

interface ChatListHeaderProps {
  isEditMode: boolean;
  isConnected: boolean;
  isRefreshing?: boolean;
  onToggleEditMode: () => void;
  onToggleSearch: () => void;
  onNewChat: () => void;
  isSearchVisible: boolean;
}

export const ChatListHeader: React.FC<ChatListHeaderProps> = ({
  isEditMode,
  isConnected,
  isRefreshing = false,
  onToggleEditMode,
  onToggleSearch,
  onNewChat,
  isSearchVisible,
}) => {
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;
  const isElectronDesktop = isElectron && isWideScreen;

  const reduceAnimations = useAnimationStore((s) => s.reduceAnimations);

  // Плавная cross-fade анимация между обычным и edit режимом
  const editModeProgress = useRef(new Animated.Value(isEditMode ? 1 : 0)).current;

  useEffect(() => {
    if (reduceAnimations) {
      editModeProgress.setValue(isEditMode ? 1 : 0);
      return;
    }
    Animated.timing(editModeProgress, {
      toValue: isEditMode ? 1 : 0,
      duration: 250,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isEditMode]);

  const normalOpacity = editModeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const editOpacity = editModeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const normalScale = editModeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.85],
  });

  const editScale = editModeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1],
  });

  // On Electron desktop, header controls and loading indicator are in TitleBar
  if (isElectronDesktop) {
    return null;
  }

  return (
    <View
      style={[
        styles.headerRow,
        { marginTop: isEditMode ? 0 : 0, marginBottom: isEditMode ? -4 : -4 },
      ]}
    >
      {/* Left - Notifications (Mobile only) or Empty space (Desktop) */}
      <View style={styles.headerLeft}>
        {!isWideScreen && <NotificationBell />}
      </View>

      {/* Center - Title or Connection Status with fixed height to prevent layout shift */}
      <View style={styles.headerCenter}>
        {isConnected === false || isRefreshing ? (
          <ConnectionStatus compact isRefreshing={isRefreshing} />
        ) : (
          <Text style={[styles.headerTitle, { color: theme.text }]}>Чаты</Text>
        )}
      </View>

      {/* Right - Actions (hidden on Electron desktop - moved to TitleBar) */}
      <View style={[styles.headerRight, styles.headerActions]}>
        {!(isElectron && isWideScreen) && (
          <>
            {/* Normal mode buttons */}
            <Animated.View
              style={[styles.headerButtonsRow, { opacity: normalOpacity, transform: [{ scale: normalScale }] }]}
              pointerEvents={isEditMode ? 'none' : 'auto'}
            >
              <TouchableOpacity onPress={onToggleEditMode} style={styles.iconButton}>
                <Ionicons name="ellipsis-vertical" size={24} color={theme.error} />
              </TouchableOpacity>
              {!isElectron && (
                <TouchableOpacity onPress={onToggleSearch} style={[styles.iconButton, styles.searchButton]}>
                  <Ionicons
                    name={isSearchVisible ? 'close' : 'search'}
                    size={22}
                    color={theme.error}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onNewChat} style={styles.addButton}>
                <Ionicons name="add" size={30} color={theme.primary} />
              </TouchableOpacity>
            </Animated.View>

            {/* Edit mode button - overlaid on full headerRight */}
            <Animated.View
              style={[styles.editOverlay, { opacity: editOpacity, transform: [{ scale: editScale }] }]}
              pointerEvents={isEditMode ? 'auto' : 'none'}
            >
              <TouchableOpacity onPress={onToggleEditMode} style={styles.editButton}>
                <Text style={[styles.editButtonText, { color: theme.error }]}>Готово</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28, // Fixed height to prevent layout shift
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerLeft: {
    width: 100,
    justifyContent: 'flex-start',
  },
  editButton: {
    paddingHorizontal: 4,
  },
  editButtonText: {
    fontSize: 18,
    fontWeight: '400',
  },
  addButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 100,
    justifyContent: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    marginLeft: 4,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
});
