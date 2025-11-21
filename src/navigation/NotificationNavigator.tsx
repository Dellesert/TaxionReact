/**
 * Notification Navigator
 * Навигация для экранов уведомлений
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NotificationStackParamList } from './types';
import NotificationListScreen from '@screens/notification/NotificationListScreen';

const Stack = createNativeStackNavigator<NotificationStackParamList>();

const NotificationNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="NotificationList"
        component={NotificationListScreen}
      />
    </Stack.Navigator>
  );
};

export default NotificationNavigator;
