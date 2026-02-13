/**
 * Profile Navigator
 * Навигация для экранов профиля
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import ProfileSplitView from '@/features/profile/screens/ProfileSplitView';
import EditProfileScreen from '@/features/profile/screens/EditProfileScreen';
import ChangePasswordScreen from '@/features/profile/screens/ChangePasswordScreen';
import NotificationSettingsScreen from '@/features/profile/screens/NotificationSettingsScreen';
import ActiveSessionsScreen from '@/features/profile/screens/ActiveSessionsScreen';
import PasskeyManagementScreen from '@/features/profile/screens/PasskeyManagementScreen';
import AboutScreen from '@/features/profile/screens/AboutScreen';
import StorageScreen from '@/features/profile/screens/StorageScreen';
import AnalyticsHubScreen from '@/features/admin/screens/AnalyticsHubScreen';
import MetricsAnalyticsScreen from '@/features/admin/screens/MetricsAnalyticsScreen';
import PerformanceAnalyticsScreen from '@/features/admin/screens/PerformanceAnalyticsScreen';
import DepartmentsAnalyticsScreen from '@/features/admin/screens/DepartmentsAnalyticsScreen';
import SecurityAnalyticsScreen from '@/features/admin/screens/SecurityAnalyticsScreen';
import DepartmentsScreen from '@/features/admin/screens/DepartmentsScreen';
import EditDepartmentScreen from '@/features/admin/screens/EditDepartmentScreen';
import UsersScreen from '@/features/admin/screens/UsersScreen';
import UserGroupsScreen from '@/features/admin/screens/UserGroupsScreen';
import EditUserGroupScreen from '@/features/admin/screens/EditUserGroupScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  NotificationSettings: undefined;
  ActiveSessions: undefined;
  PasskeyManagement: undefined;
  About: undefined;
  Storage: undefined;
  Analytics: undefined;
  MetricsAnalytics: undefined;
  PerformanceAnalytics: undefined;
  DepartmentsAnalytics: undefined;
  SecurityAnalytics: undefined;
  Departments: undefined;
  EditDepartment: { departmentId: number };
  Users: undefined;
  UserGroups: undefined;
  EditUserGroup: { groupId: number };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileNavigator: React.FC = () => {
  const isWideScreen = useIsWideScreen();

  // Desktop mode: use ProfileSplitView with sidebar navigation
  if (isWideScreen) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="ProfileMain" component={ProfileSplitView} />
        {/* Analytics sub-screens for drill-down navigation */}
        <Stack.Screen name="MetricsAnalytics" component={MetricsAnalyticsScreen} />
        <Stack.Screen name="PerformanceAnalytics" component={PerformanceAnalyticsScreen} />
        <Stack.Screen name="DepartmentsAnalytics" component={DepartmentsAnalyticsScreen} />
        <Stack.Screen name="SecurityAnalytics" component={SecurityAnalyticsScreen} />
      </Stack.Navigator>
    );
  }

  // Mobile mode: use stack navigation
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'default',
        animationDuration: 150,
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="ActiveSessions" component={ActiveSessionsScreen} />
      <Stack.Screen name="PasskeyManagement" component={PasskeyManagementScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Storage" component={StorageScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsHubScreen} />
      <Stack.Screen name="MetricsAnalytics" component={MetricsAnalyticsScreen} />
      <Stack.Screen name="PerformanceAnalytics" component={PerformanceAnalyticsScreen} />
      <Stack.Screen name="DepartmentsAnalytics" component={DepartmentsAnalyticsScreen} />
      <Stack.Screen name="SecurityAnalytics" component={SecurityAnalyticsScreen} />
      <Stack.Screen name="Departments" component={DepartmentsScreen} />
      <Stack.Screen name="EditDepartment" component={EditDepartmentScreen} />
      <Stack.Screen name="Users" component={UsersScreen} />
      <Stack.Screen name="UserGroups" component={UserGroupsScreen} />
      <Stack.Screen name="EditUserGroup" component={EditUserGroupScreen} />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;
