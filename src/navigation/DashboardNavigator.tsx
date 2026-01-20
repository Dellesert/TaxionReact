/**
 * Dashboard Navigator
 * Стек навигации для экрана сводки (Dashboard) - только для мобильной версии
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '@shared/hooks/useTheme';
import { DashboardStackParamList } from './types';

// Screens
import DashboardScreen from '@/features/dashboard/screens/DashboardScreen';
import ScheduleScreen from '@/features/dashboard/screens/ScheduleScreen';
import { ScheduleListScreen } from '@/features/schedules/screens/ScheduleListScreen';
import { ScheduleDetailScreen } from '@/features/schedules/screens/ScheduleDetailScreen';
import TaskListScreen from '@/features/tasks/screens/TaskListScreen';
import TaskDetailScreen from '@/features/tasks/screens/TaskDetailScreen';
import PollListScreen from '@/features/polls/screens/PollListScreen';
import PollDetailScreen from '@/features/polls/screens/PollDetailScreen';
import PollVotersScreen from '@/features/polls/screens/PollVotersScreen';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

const DashboardNavigator: React.FC = () => {
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
        animation: 'default',
        animationDuration: 150,
      }}
    >
      <Stack.Screen
        name="DashboardMain"
        component={DashboardScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TaskList"
        component={TaskListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{
          headerShown: false,
        }}
      />
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
        name="PollVoters"
        component={PollVotersScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ScheduleList"
        component={ScheduleListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ScheduleDetail"
        component={ScheduleDetailScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default DashboardNavigator;
