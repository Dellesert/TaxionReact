/**
 * Calendar Navigator
 * Стек навигации для календаря событий
 */

import React, { useEffect, lazy } from 'react';
import { InteractionManager } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useDesktopNavigation } from '@shared/contexts/DesktopNavigationContext';
import { CalendarStackParamList } from './types';
import CalendarScreen from '@/features/calendar/screens/CalendarScreen';
import { SwipeBackView } from '@shared/components/common/SwipeBackView';

// Lazy-load EventDetailScreen - only needed when navigating to event details
const EventDetailScreen = lazy(() => import('@/features/calendar/screens/EventDetailScreen'));

const Stack = createNativeStackNavigator<CalendarStackParamList>();

const CalendarNavigator: React.FC = () => {
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();
  const desktopNav = useDesktopNavigation();
  const navigation = useNavigation();

  // Handle navigation params from desktop navigation context
  useEffect(() => {
    if (isWideScreen && desktopNav.navigationParams?.eventId) {
      const eventId = desktopNav.navigationParams.eventId;
      if (typeof eventId === 'number') {
        // Wait for navigation to be ready, then navigate
        const task = InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            // @ts-ignore
            navigation.navigate('EventDetail', { eventId });
          }, 100);
        });

        // Clear navigation params after scheduling
        desktopNav.clearNavigationParams();

        return () => task.cancel();
      }
    }
  }, [isWideScreen, desktopNav.navigationParams, navigation, desktopNav]);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.backgroundSecondary,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
          color: theme.text,
        },
        headerShadowVisible: true,
        contentStyle: {
          backgroundColor: theme.background,
        },
        animation: 'default',
        animationDuration: 150,
        gestureEnabled: true,
      }}
      screenLayout={({ children }) => <SwipeBackView>{children}</SwipeBackView>}
    >
      <Stack.Screen
        name="CalendarMain"
        component={CalendarScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={({ route }) => {
          const params = route.params as any;
          return {
            // Показываем header только если событие открыто из чата
            headerShown: params?.fromChat === true,
            title: 'Событие',
            headerBackTitle: '',
          };
        }}
      />
    </Stack.Navigator>
  );
};

export default CalendarNavigator;
