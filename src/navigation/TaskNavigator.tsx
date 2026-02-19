/**
 * Task Navigator
 * Стек навигации для задач
 */

import React, { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useDesktopNavigation } from '@shared/contexts/DesktopNavigationContext';
import { TaskStackParamList } from './types';
import TaskListScreen from '@/features/tasks/screens/TaskListScreen';
import TaskDetailScreen from '@/features/tasks/screens/TaskDetailScreen';

const Stack = createNativeStackNavigator<TaskStackParamList>();

const TaskNavigator: React.FC = () => {
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();
  const desktopNav = useDesktopNavigation();
  const navigation = useNavigation();

  // Handle navigation params from desktop navigation context
  useEffect(() => {
    if (isWideScreen && desktopNav.navigationParams?.taskId) {
      const taskId = desktopNav.navigationParams.taskId;

      if (typeof taskId === 'number') {
        // Wait for navigation to be ready, then navigate
        const task = InteractionManager.runAfterInteractions(() => {
          setTimeout(() => {
            // @ts-ignore
            navigation.navigate('TaskDetail', { taskId });
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
      }}
    >
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
    </Stack.Navigator>
  );
};

export default TaskNavigator;
