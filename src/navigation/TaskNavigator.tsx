/**
 * Task Navigator
 * Стек навигации для задач
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TaskStackParamList } from './types';
import TaskListScreen from '@screens/task/TaskListScreen';
import CreateTaskScreen from '@screens/task/CreateTaskScreen';
import TaskDetailScreen from '@screens/task/TaskDetailScreen';

const Stack = createNativeStackNavigator<TaskStackParamList>();

const TaskNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#1F2937',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerShadowVisible: true,
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
        name="CreateTask"
        component={CreateTaskScreen}
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
