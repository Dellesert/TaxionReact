/**
 * Кастомный анимированный Tab Bar
 * Плавно скрывается/появляется при навигации в чат
 */

import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useChatStore } from '@shared/store/chatStore';

export const AnimatedTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const totalUnreadCount = useChatStore((state) => state.totalUnreadCount);

  // Анимированное значение для скрытия/показа tab bar (используем обычный Animated API)
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Проверяем текущий route
    const currentRoute = state.routes[state.index];
    const routeIndex = currentRoute.state?.index;
    const routeName = routeIndex !== undefined ? currentRoute.state?.routes?.[routeIndex]?.name : undefined;

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

  const isDark = theme.background === '#000000' || theme.background === '#121212' || theme.background.toLowerCase().startsWith('#0') || theme.background.toLowerCase().startsWith('#1');

  return (
    <Animated.View
      style={[
        styles.outerContainer,
        {
          paddingBottom: Platform.OS === 'ios' ? 12 : (insets.bottom > 0 ? insets.bottom : 16),
          transform: [{ translateY }],
        },
      ]}
    >
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={[
          styles.blurContainer,
          {
            backgroundColor: Platform.OS === 'android'
              ? (isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(245, 245, 245, 0.15)')
              : (isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(245, 245, 245, 0.15)'),
            borderWidth: isDark ? 0 : 1,
            borderColor: isDark ? 'transparent' : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      >
      {state.routes.map((route, index) => {
        // Skip Admin route (hidden from tab bar)
        if (route.name === 'Admin') {
          return null;
        }

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

        // Получаем имя иконки в зависимости от роута
        let iconName = 'help-outline';
        if (route.name === 'Dashboard') {
          iconName = isFocused ? 'grid' : 'grid-outline';
        } else if (route.name === 'Chats') {
          iconName = isFocused ? 'chatbubbles' : 'chatbubbles-outline';
        } else if (route.name === 'Tasks') {
          iconName = isFocused ? 'checkbox' : 'checkbox-outline';
        } else if (route.name === 'Polls') {
          iconName = isFocused ? 'bar-chart' : 'bar-chart-outline';
        } else if (route.name === 'Calendar') {
          iconName = isFocused ? 'calendar' : 'calendar-outline';
        } else if (route.name === 'Profile') {
          iconName = isFocused ? 'settings' : 'settings-outline';
        }

        // Показываем бейдж для чатов
        const showBadge = route.name === 'Chats' && totalUnreadCount > 0;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={styles.tab}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={iconName as any}
                size={26}
                color={isFocused ? theme.primary : theme.textTertiary}
              />
              {showBadge && (
                <View style={[
                  styles.badge,
                  { backgroundColor: theme.error || '#FF3B30', borderColor: theme.backgroundSecondary },
                  totalUnreadCount > 99 && styles.badgeLarge,
                ]}>
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
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
  },
  blurContainer: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    position: 'relative',
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeLarge: {
    right: -18,
    minWidth: 30,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});
