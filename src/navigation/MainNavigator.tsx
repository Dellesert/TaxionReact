/**
 * Main Navigator
 * Главная навигация с bottom tabs для авторизованных пользователей
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { MainTabParamList } from './types';
import ChatNavigator from './ChatNavigator';
import TaskNavigator from './TaskNavigator';
import CalendarScreen from '@screens/calendar/CalendarScreen';
import PollListScreen from '@screens/poll/PollListScreen';
import ProfileScreen from '@screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Chats"
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
            case 'PollList':
              iconName = focused ? 'bar-chart-outline' : 'bar-chart-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={26} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.backgroundSecondary,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 85,
          paddingTop: 6,
          paddingHorizontal: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          paddingTop: 2,
        },
      })}
    >

      <Tab.Screen
        name="Tasks"
        component={TaskNavigator}
        options={{ tabBarLabel: 'Задачи' }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ tabBarLabel: 'События' }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatNavigator}
        options={{ tabBarLabel: 'Чаты' }}
      />
      <Tab.Screen
        name="PollList"
        component={PollListScreen}
        options={{ tabBarLabel: 'Опросы' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Я' }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
