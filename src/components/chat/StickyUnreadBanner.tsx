/**
 * StickyUnreadBanner Component
 * Постоянный баннер сверху экрана, показывающий количество непрочитанных сообщений
 * Исчезает только когда пользователь доскроллил до самого нового сообщения
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface StickyUnreadBannerProps {
  unreadCount: number;
  visible: boolean;
  onPress: () => void;
}

export const StickyUnreadBanner: React.FC<StickyUnreadBannerProps> = ({
  unreadCount,
  visible,
  onPress,
}) => {
  const { theme } = useTheme();
  const slideAnim = React.useRef(new Animated.Value(visible ? 0 : -100)).current;

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -100,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [visible, slideAnim]);

  if (unreadCount === 0) {
    return null;
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.primary,
      shadowColor: theme.textPrimary,
    },
    text: {
      color: '#FFFFFF',
    },
  });

  const getUnreadText = (count: number) => {
    if (count === 1) return '1 непрочитанное сообщение';
    if (count >= 2 && count <= 4) return `${count} непрочитанных сообщения`;
    return `${count} непрочитанных сообщений`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        dynamicStyles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <Icon name="message-text-outline" size={18} color="#FFFFFF" />
          <Text style={[styles.text, dynamicStyles.text]}>
            {getUnreadText(unreadCount)}
          </Text>
          <Icon name="chevron-down" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 1000,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
  },
  touchable: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
});
