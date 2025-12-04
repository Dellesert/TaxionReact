import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminStackParamList } from './types';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import AdminSplitView from '@/features/admin/screens/AdminSplitView';
import DepartmentsScreen from '@/features/admin/screens/DepartmentsScreen';
import EditDepartmentScreen from '@/features/admin/screens/EditDepartmentScreen';
import UsersScreen from '@/features/admin/screens/UsersScreen';
import MetricsAnalyticsScreen from '@/features/admin/screens/MetricsAnalyticsScreen';
import MetricsDesktopContent from '@/features/admin/components/MetricsDesktopContent';
import PerformanceAnalyticsScreen from '@/features/admin/screens/PerformanceAnalyticsScreen';
import DepartmentsAnalyticsScreen from '@/features/admin/screens/DepartmentsAnalyticsScreen';
import SecurityAnalyticsScreen from '@/features/admin/screens/SecurityAnalyticsScreen';
import { AdminContentArea } from '@/features/admin/components/AdminContentArea';

// Wrapper for Metrics that adapts to screen size
const MetricsAnalyticsWrapper: React.FC = () => {
  const isWideScreen = useIsWideScreen();

  if (isWideScreen) {
    return (
      <View style={{ flex: 1 }}>
        <MetricsDesktopContent />
      </View>
    );
  }

  return <MetricsAnalyticsScreen />;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

const AdminNavigator: React.FC = () => {
  const isWideScreen = useIsWideScreen();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={isWideScreen ? 'AdminHub' : 'Departments'}
    >
      {isWideScreen && (
        <Stack.Screen name="AdminHub" component={AdminSplitView} />
      )}
      <Stack.Screen name="Departments" component={DepartmentsScreen} />
      <Stack.Screen name="EditDepartment" component={EditDepartmentScreen} />
      <Stack.Screen name="Users" component={UsersScreen} />
      <Stack.Screen name="MetricsAnalytics" component={MetricsAnalyticsWrapper} />
      <Stack.Screen name="PerformanceAnalytics" component={PerformanceAnalyticsScreen} />
      <Stack.Screen name="DepartmentsAnalytics" component={DepartmentsAnalyticsScreen} />
      <Stack.Screen name="SecurityAnalytics" component={SecurityAnalyticsScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
