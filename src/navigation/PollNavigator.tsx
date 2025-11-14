/**
 * Poll Navigator
 * Стек навигации для опросов
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@hooks/useTheme';
import { PollStackParamList } from './types';
import PollListScreen from '@screens/poll/PollListScreen';
import PollDetailScreen from '@screens/poll/PollDetailScreen';
import EditPollScreen from '@screens/poll/EditPollScreen';
import PollVotersScreen from '@screens/poll/PollVotersScreen';

const Stack = createNativeStackNavigator<PollStackParamList>();

const PollNavigator: React.FC = () => {
  const { theme } = useTheme();

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
        animation: 'fade',
        animationDuration: 200,
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
        name="EditPoll"
        component={EditPollScreen}
        options={{
          headerShown: false,
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
