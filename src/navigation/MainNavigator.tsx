/**
 * Main Navigator
 * Главная навигация с bottom tabs для авторизованных пользователей
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useChatStore } from '@shared/store/chatStore';
import { ChatSelectionProvider } from '@shared/contexts/ChatSelectionContext';
import { useDesktopNavigation } from '@shared/contexts/DesktopNavigationContext';
import { MainTabParamList } from './types';
import ChatNavigator from './ChatNavigator';
import TaskNavigator from './TaskNavigator';
import PollNavigator from './PollNavigator';
import DashboardNavigator from './DashboardNavigator';
import AdminNavigator from './AdminNavigator';
import ProfileNavigator from './ProfileNavigator';
import NotificationNavigator from './NotificationNavigator';
import CalendarNavigator from './CalendarNavigator';
import { AnimatedTabBar } from '@shared/components/navigation/AnimatedTabBar';
import { SideNavBar } from '@shared/components/navigation/SideNavBar';

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainNavigatorContent: React.FC = () => {
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();
  const chats = useChatStore((state) => state.chats);
  const desktopNav = useDesktopNavigation();
  const [activeTab, setActiveTab] = useState<string>('Chats');

  // Подсчитываем общее количество непрочитанных сообщений
  const totalUnreadCount = useMemo(() => {
    return chats.reduce((total, chat) => total + (chat.unread_count || 0), 0);
  }, [chats]);

  // Desktop mode: render with side navbar
  if (isWideScreen) {
    const currentActiveTab = desktopNav.activeTab;

    const renderContent = () => {
      switch (currentActiveTab) {
        case 'Tasks':
          return <TaskNavigator />;
        case 'Polls':
          return <PollNavigator />;
        case 'Chats':
          return <ChatNavigator />;
        case 'Calendar':
          return <CalendarNavigator />;
        case 'Notifications':
          return <NotificationNavigator />;
        case 'Admin':
          return <AdminNavigator />;
        case 'Profile':
          return <ProfileNavigator />;
        default:
          return <ChatNavigator />;
      }
    };

    return (
      <View style={[styles.desktopContainer, { backgroundColor: theme.background }]}>
        <SideNavBar
          activeRoute={currentActiveTab}
          onNavigate={desktopNav.navigateToTab}
          totalUnreadCount={totalUnreadCount}
        />
        <View style={styles.desktopContent}>
          {renderContent()}
        </View>
      </View>
    );
  }

  // Mobile mode: render with bottom tabs
  return (
    <Tab.Navigator
      initialRouteName="Chats"
      sceneContainerStyle={{
        backgroundColor: theme.background,
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
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
        name="Dashboard"
        component={DashboardNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Главная',
          tabBarStyle: ((route) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'DashboardMain';
            // Скрываем табы на детальных экранах
            if (['TaskDetail', 'PollDetail', 'PollVoters', 'Analytics', 'ScheduleList', 'ScheduleDetail'].includes(routeName)) {
              return { display: 'none' };
            }
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
        name="Calendar"
        component={CalendarNavigator}
        options={({ route }) => ({
          tabBarLabel: 'Календарь',
          tabBarStyle: ((route) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'CalendarMain';
            if (routeName === 'EventDetail') {
              // Скрываем табы на экране детального просмотра события
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
        name="Profile"
        component={ProfileNavigator}
        options={{ tabBarLabel: 'Настройки' }}
      />

      <Tab.Screen
        name="Admin"
        component={AdminNavigator}
        options={{
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopContent: {
    flex: 1,
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

const MainNavigator: React.FC = () => {
  return (
    <ChatSelectionProvider>
      <MainNavigatorContent />
    </ChatSelectionProvider>
  );
};

export default MainNavigator;
