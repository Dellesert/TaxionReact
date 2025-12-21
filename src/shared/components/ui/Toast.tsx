/**
 * Toast Component
 * Компонент для отображения временных уведомлений
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
}

const { width } = Dimensions.get('window');

// Цветовые схемы для каждого типа
const TOAST_THEMES = {
  success: {
    background: '#ECFDF5',
    border: '#10B981',
    icon: '#059669',
    text: '#065F46',
  },
  error: {
    background: '#FEF2F2',
    border: '#EF4444',
    icon: '#DC2626',
    text: '#991B1B',
  },
  warning: {
    background: '#FFFBEB',
    border: '#F59E0B',
    icon: '#D97706',
    text: '#92400E',
  },
  info: {
    background: '#EFF6FF',
    border: '#3B82F6',
    icon: '#2563EB',
    text: '#1E40AF',
  },
};

const TOAST_ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
};

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type = 'info',
  duration = 4000,
  onHide,
}) => {
  const isDesktop = useIsWideScreen();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const progressWidth = useRef(new Animated.Value(100)).current;

  const theme = TOAST_THEMES[type];

  useEffect(() => {
    // Анимация появления
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Анимация прогресс-бара
    Animated.timing(progressWidth, {
      toValue: 0,
      duration: duration,
      useNativeDriver: false,
    }).start();

    // Автоматическое скрытие
    const timer = setTimeout(() => {
      hideToast();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isDesktop && styles.containerDesktop,
        {
          backgroundColor: theme.background,
          borderLeftColor: theme.border,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={hideToast}
        activeOpacity={0.95}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.border }]}>
          <Ionicons name={TOAST_ICONS[type]} size={18} color="#FFFFFF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: theme.text }]} numberOfLines={3}>
            {message}
          </Text>
        </View>
        <TouchableOpacity onPress={hideToast} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color={theme.icon} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Прогресс-бар */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            backgroundColor: theme.border,
            width: progressWidth.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    left: 16,
    right: 16,
    maxWidth: width - 32,
    borderRadius: 12,
    borderLeftWidth: 4,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
    zIndex: 9999,
  },
  containerDesktop: {
    position: 'absolute',
    right: 24,
    bottom: 36,
    left: 'auto',
    width: 380,
    maxWidth: 380,
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 10,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  closeButton: {
    marginLeft: 12,
    padding: 4,
    opacity: 0.7,
  },
  progressBar: {
    height: 3,
    position: 'absolute',
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: 12,
  },
});

export default Toast;
