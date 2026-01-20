import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ScheduleListScreen } from '../screens/ScheduleListScreen';
import { ScheduleDetailScreen } from '../screens/ScheduleDetailScreen';
import type { ScheduleStackParamList } from './types';

const Stack = createNativeStackNavigator<ScheduleStackParamList>();

export const ScheduleNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ScheduleList"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ScheduleList" component={ScheduleListScreen} />
      <Stack.Screen name="ScheduleDetail" component={ScheduleDetailScreen} />
    </Stack.Navigator>
  );
};

export default ScheduleNavigator;
