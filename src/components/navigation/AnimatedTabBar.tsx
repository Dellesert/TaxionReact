/**
 * Кастомный анимированный Tab Bar
 * Плавно скрывается/появляется при навигации в чат
 */

import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useChatStore } from '@store/chatStore';

export const AnimatedTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const chats = useChatStore((state) => state.chats);

  // Подсчитываем общее количество непрочитанных сообщений
  const totalUnreadCount = React.useMemo(() => {
    return chats.reduce((total, chat) => total + (chat.unread_count || 0), 0);
  }, [chats]);

  // Анимированное значение для скрытия/показа tab bar (используем обычный Animated API)
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Проверяем текущий route
    const currentRoute = state.routes[state.index];
    const routeName = currentRoute.state?.routes?.[currentRoute.state.index]?.name;

    // Скрываем tab bar на экранах Chat и ChatSettings
    if (routeName === 'Chat' || routeName === 'ChatSettings') {
      Animated.timing(translateY, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [state, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom,
          transform: [{ translateY }],
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Получаем иконку
        const iconName = options.tabBarIcon
          ? (options.tabBarIcon as any)({
              focused: isFocused,
              color: isFocused ? theme.primary : theme.textTertiary,
              size: 26,
            }).props.name
          : 'help-outline';

        // Показываем бейдж для чатов
        const showBadge = route.name === 'Chats' && totalUnreadCount > 0;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tab}
          >
            <View>
              <Ionicons
                name={iconName}
                size={26}
                color={isFocused ? theme.primary : theme.textTertiary}
              />
              {showBadge && (
                <View style={[styles.badge, { backgroundColor: theme.primaryDark || '#FF3B30' }]}>
                  <Text style={styles.badgeText}>
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.label,
                {
                  color: isFocused ? theme.primary : theme.textTertiary,
                },
              ]}
            >
              {label as string}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 6,
    paddingHorizontal: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
