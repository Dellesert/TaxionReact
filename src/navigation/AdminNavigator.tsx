import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminStackParamList } from './types';
import DepartmentsScreen from '@screens/admin/DepartmentsScreen';
import EditDepartmentScreen from '@screens/admin/EditDepartmentScreen';
import UsersScreen from '@screens/admin/UsersScreen';

const Stack = createNativeStackNavigator<AdminStackParamList>();

const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Departments" component={DepartmentsScreen} />
      <Stack.Screen name="EditDepartment" component={EditDepartmentScreen} />
      <Stack.Screen name="Users" component={UsersScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
