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
import CreatePollScreen from '@screens/poll/CreatePollScreen';
import EditPollScreen from '@screens/poll/EditPollScreen';

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
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CreatePoll"
        component={CreatePollScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EditPoll"
        component={EditPollScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default PollNavigator;
