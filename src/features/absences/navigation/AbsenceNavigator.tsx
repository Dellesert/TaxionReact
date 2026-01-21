import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AbsenceStackParamList } from './types';
import { AbsenceListScreen } from '../screens/AbsenceListScreen';

const Stack = createNativeStackNavigator<AbsenceStackParamList>();

export const AbsenceNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AbsenceList" component={AbsenceListScreen} />
    </Stack.Navigator>
  );
};

export default AbsenceNavigator;
