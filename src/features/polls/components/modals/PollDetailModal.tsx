/**
 * PollDetailModal
 * Модальное окно для отображения деталей опроса из чата
 * Использует существующий PollDetailScreen, обернутый в модальное окно
 */

import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import PollDetailScreen from '../../screens/PollDetailScreen';
import { NavigationContext } from '@react-navigation/native';
// @ts-ignore - internal API
import { NavigationRouteContext } from '@react-navigation/native';

interface PollDetailModalProps {
  visible: boolean;
  pollId: number;
  onClose: () => void;
}

const PollDetailModal: React.FC<PollDetailModalProps> = ({ visible, pollId, onClose }) => {
  const { theme } = useTheme();
  const isDesktop = useIsWideScreen();
  const isElectronApp = Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).electron;
  const isDesktopElectron = isDesktop && isElectronApp;
  const animationType = useAnimationType(isDesktopElectron ? 'fade' : 'slide');
  const [headerOptions, setHeaderOptions] = useState<any>({});
  const [hoveredWindowBtn, setHoveredWindowBtn] = useState<'minimize' | 'maximize' | 'close' | null>(null);

  // Create a minimal navigation state
  const navigationState = useMemo(() => ({
    key: 'modal-root',
    index: 0,
    routeNames: ['PollDetail'],
    routes: [
      {
        key: `poll-${pollId}`,
        name: 'PollDetail',
        params: {
          pollId,
          fromChat: true,
        },
      },
    ],
    stale: false,
    type: 'stack',
  }), [pollId]);

  // Create mock navigation helpers
  const navigation = useMemo(() => ({
    navigate: () => {},
    goBack: onClose,
    setOptions: (options: any) => {
      setHeaderOptions(options);
    },
    getParent: () => null,
    addListener: () => () => {},
    removeListener: () => {},
    isFocused: () => true,
    canGoBack: () => false,
    getId: () => undefined,
    getState: () => navigationState,
    dispatch: () => {},
    reset: () => {},
    setParams: () => {},
  }), [onClose, navigationState]);

  if (!visible) {
    return null;
  }

  // ===== DESKTOP ELECTRON: Custom title bar =====
  if (isDesktopElectron) {
    return (
      <Modal
        visible={visible}
        animationType={animationType}
        transparent={false}
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={[styles.desktopContainer, { backgroundColor: theme.background }]}>
          {/* Custom Title Bar */}
          <View style={[styles.desktopTitleBar, { backgroundColor: theme.backgroundSecondary }]}>
            {/* Back button */}
            <View
              style={styles.desktopTitleBarBackButton}
              // @ts-ignore
              onClick={onClose}
              onMouseEnter={(e: any) => {
                if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
              }}
              onMouseLeave={(e: any) => {
                if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Ionicons name="arrow-back" size={18} color={theme.text} />
            </View>

            {/* Title — draggable area */}
            <View style={styles.desktopTitleBarDragArea}>
              <Text style={[styles.desktopTitleBarTitle, { color: theme.text }]} numberOfLines={1}>
                Опрос
              </Text>
            </View>

            {/* Right controls (three-dot menu from PollDetailScreen) */}
            {headerOptions.headerRight && (
              <View style={styles.desktopTitleBarControls}>
                {headerOptions.headerRight()}
              </View>
            )}

            {/* Window controls */}
            <View style={styles.desktopWindowControls}>
              <View
                style={[styles.desktopWindowControlButton, hoveredWindowBtn === 'minimize' && { backgroundColor: theme.border }]}
                // @ts-ignore
                onClick={() => window.electron?.minimize?.()}
                onMouseEnter={() => setHoveredWindowBtn('minimize')}
                onMouseLeave={() => setHoveredWindowBtn(null)}
              >
                <Ionicons name="remove" size={14} color={theme.text} />
              </View>
              <View
                style={[styles.desktopWindowControlButton, hoveredWindowBtn === 'maximize' && { backgroundColor: theme.border }]}
                // @ts-ignore
                onClick={() => window.electron?.maximize?.()}
                onMouseEnter={() => setHoveredWindowBtn('maximize')}
                onMouseLeave={() => setHoveredWindowBtn(null)}
              >
                <Ionicons name="square-outline" size={12} color={theme.text} />
              </View>
              <View
                style={[styles.desktopWindowControlButton, hoveredWindowBtn === 'close' && { backgroundColor: '#E81123' }]}
                // @ts-ignore
                onClick={() => window.electron?.close?.()}
                onMouseEnter={() => setHoveredWindowBtn('close')}
                onMouseLeave={() => setHoveredWindowBtn(null)}
              >
                <Ionicons name="close" size={14} color={hoveredWindowBtn === 'close' ? '#FFFFFF' : theme.text} />
              </View>
            </View>

            {/* Bottom border */}
            <View style={[styles.desktopTitleBarBorder, { backgroundColor: theme.border }]} />
          </View>

          {/* Poll Detail Screen with Navigation Context */}
          <NavigationContext.Provider value={navigation as any}>
            <NavigationRouteContext.Provider value={navigationState.routes[0] as any}>
              <PollDetailScreen />
            </NavigationRouteContext.Provider>
          </NavigationContext.Provider>
        </View>
      </Modal>
    );
  }

  // ===== MOBILE (без изменений) =====
  return (
    <Modal
      visible={visible}
      animationType={animationType}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header bar with back button, title and action buttons */}
        <View style={[styles.headerBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <Text
              style={[styles.headerTitle, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Опрос
            </Text>
          </View>

          <View style={styles.headerRight}>
            {headerOptions.headerRight && headerOptions.headerRight()}
          </View>
        </View>

        {/* Poll Detail Screen with Navigation Context */}
        <NavigationContext.Provider value={navigation as any}>
          <NavigationRouteContext.Provider value={navigationState.routes[0] as any}>
            <PollDetailScreen />
          </NavigationRouteContext.Provider>
        </NavigationContext.Provider>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    paddingTop: 50,
    borderBottomWidth: 1,
    zIndex: 10,
    height: 100,
  },
  headerLeft: {
    width: 60,
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingRight: 8,
  },
  // ===== Desktop Electron styles =====
  desktopContainer: {
    flex: 1,
  },
  desktopTitleBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    // @ts-ignore
    WebkitAppRegion: 'no-drag',
    userSelect: 'none',
  },
  desktopTitleBarBackButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginLeft: 12,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    WebkitAppRegion: 'no-drag',
  },
  desktopTitleBarDragArea: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 12,
    // @ts-ignore
    WebkitAppRegion: 'drag',
  },
  desktopTitleBarTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  desktopTitleBarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    // @ts-ignore
    WebkitAppRegion: 'no-drag',
  },
  desktopWindowControls: {
    flexDirection: 'row',
    height: '100%',
    flexShrink: 0,
    // @ts-ignore
    WebkitAppRegion: 'no-drag',
  },
  desktopWindowControlButton: {
    width: 40,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  desktopTitleBarBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});

export default PollDetailModal;
