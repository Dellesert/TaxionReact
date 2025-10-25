/**
 * Main Navigator
 * Главная навигация с bottom tabs для авторизованных пользователей
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useChatStore } from '@store/chatStore';
import { MainTabParamList } from './types';
import ChatNavigator from './ChatNavigator';
import TaskNavigator from './TaskNavigator';
import PollNavigator from './PollNavigator';
import CalendarScreen from '@screens/calendar/CalendarScreen';
import ProfileScreen from '@screens/profile/ProfileScreen';
import { AnimatedTabBar } from '@components/navigation/AnimatedTabBar';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
  const { theme } = useTheme();
  const chats = useChatStore((state) => state.chats);

  // Подсчитываем общее количество непрочитанных сообщений
  const totalUnreadCount = useMemo(() => {
    return chats.reduce((total, chat) => total + (chat.unread_count || 0), 0);
  }, [chats]);

  return (
    <Tab.Navigator
      initialRouteName="Chats"
      sceneContainerStyle={{
        backgroundColor: theme.background,
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Chats':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Tasks':
              iconName = focused ? 'checkbox' : 'checkbox-outline';
              break;
            case 'Calendar':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Polls':
              iconName = focused ? 'bar-chart-outline' : 'bar-chart-outline';
              break;
            case 'Profile':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          // Для чатов добавляем бейдж с количеством непрочитанных
          if (route.name === 'Chats' && totalUnreadCount > 0) {
            return (
              <View style={{ width: 26, height: 26 }}>
                <Ionicons name={iconName} size={26} color={color} />
                <View style={[styles.badge, { backgroundColor: theme.primaryDark || '#FF3B30' }]}>
                  <Text style={styles.badgeText}>
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </Text>
                </View>
              </View>
            );
          }

          return <Ionicons name={iconName} size={26} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
      })}
    >

      <Tab.Screen
        name="Tasks"
        component={TaskNavigator}
        options={{ tabBarLabel: 'Задачи' }}
      />
      <Tab.Screen
        name="Polls"
        component={PollNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Опросы',
          tabBarStyle: ((route) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'PollList';
            if (routeName === 'PollDetail') {
              // Скрываем табы на экране детального просмотра опроса
              return { display: 'none' };
            }
            // Показываем табы на остальных экранах
            return {
              backgroundColor: theme.backgroundSecondary,
              borderTopWidth: 1,
              borderTopColor: theme.border,
              height: 85,
              paddingTop: 6,
              paddingHorizontal: 12,
            };
          })(route),
        })}
      />
      <Tab.Screen
        name="Chats"
        component={ChatNavigator}
        options={{
          tabBarLabel: 'Чаты',
        }}
      />
       <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ tabBarLabel: 'События' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Настройки' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
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

export default MainNavigator;
