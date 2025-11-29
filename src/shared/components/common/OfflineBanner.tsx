/**
 * Offline Banner Component
 * Баннер отображающийся при отсутствии интернет соединения
 */

import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useNetworkStatus } from '@shared/hooks/useNetworkStatus';

interface OfflineBannerProps {
  showWhenOnline?: boolean; // Показывать "Подключено" при восстановлении
}

// Get status bar height without SafeAreaProvider
const getStatusBarHeight = (): number => {
  if (Platform.OS === 'ios') {
    // Use Constants.statusBarHeight or fallback
    return Constants.statusBarHeight || 44;
  }
  // Android
  return StatusBar.currentHeight || 24;
};

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  showWhenOnline = true,
}) => {
  const { isOffline } = useNetworkStatus();
  const statusBarHeight = getStatusBarHeight();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const wasOfflineRef = useRef(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOffline) {
      // Показать баннер оффлайн
      wasOfflineRef.current = true;
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (wasOfflineRef.current && showWhenOnline) {
      // Показать "Подключено" на 2 секунды
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      hideTimeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          wasOfflineRef.current = false;
        });
      }, 2000);
    } else {
      // Скрыть баннер
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isOffline, showWhenOnline, translateY, opacity]);

  const isShowingOnlineMessage = !isOffline && wasOfflineRef.current;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: statusBarHeight + 8,
          backgroundColor: isShowingOnlineMessage ? '#10B981' : '#EF4444',
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Ionicons
        name={isShowingOnlineMessage ? 'wifi' : 'cloud-offline'}
        size={18}
        color="#FFFFFF"
        style={styles.icon}
      />
      <Text style={styles.text}>
        {isShowingOnlineMessage ? 'Подключение восстановлено' : 'Нет подключения к интернету'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
    paddingHorizontal: 16,
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
