/**
 * Poll Navigator
 * Стек навигации для опросов
 */

import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useDesktopNavigation } from '@shared/contexts/DesktopNavigationContext';
import { PollStackParamList } from './types';
import PollListScreen from '@/features/polls/screens/PollListScreen';
import PollDetailScreen from '@/features/polls/screens/PollDetailScreen';
import PollVotersScreen from '@/features/polls/screens/PollVotersScreen';

const Stack = createNativeStackNavigator<PollStackParamList>();

const PollNavigator: React.FC = () => {
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();
  const desktopNav = useDesktopNavigation();
  const navigation = useNavigation();

  // Handle navigation params from desktop navigation context
  useEffect(() => {
    if (isWideScreen && desktopNav.navigationParams?.pollId) {
      const pollId = desktopNav.navigationParams.pollId;
      if (typeof pollId === 'number') {
        // Navigate to PollDetail within the stack
        // @ts-ignore
        navigation.navigate('PollDetail', { pollId });
      }
      // Clear navigation params after processing
      desktopNav.clearNavigationParams();
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
      }}
    >
      <Stack.Screen
        name="PollList"
        component={PollListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="PollDetail"
        component={PollDetailScreen}
        options={({ route }) => {
          const params = route.params as any;
          return {
            // Показываем header только если опрос открыт из чата
            headerShown: params?.fromChat === true,
            title: params?.pollTitle || 'Опрос', // Используем переданный pollTitle или 'Опрос' по умолчанию
            headerBackTitle: '',
          };
        }}
      />
      <Stack.Screen
        name="PollVoters"
        component={PollVotersScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default PollNavigator;
