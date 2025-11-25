/**
 * Profile Navigator
 * Навигация для экранов профиля
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import EditProfileScreen from '@/features/profile/screens/EditProfileScreen';
import ChangePasswordScreen from '@/features/profile/screens/ChangePasswordScreen';
import NotificationSettingsScreen from '@/features/profile/screens/NotificationSettingsScreen';
import ActiveSessionsScreen from '@/features/profile/screens/ActiveSessionsScreen';
import PasskeyManagementScreen from '@/features/profile/screens/PasskeyManagementScreen';
import AboutScreen from '@/screens/profile/AboutScreen';
import AnalyticsHubScreen from '@screens/admin/AnalyticsHubScreen';
import MetricsAnalyticsScreen from '@screens/admin/MetricsAnalyticsScreen';
import PerformanceAnalyticsScreen from '@screens/admin/PerformanceAnalyticsScreen';
import DepartmentsAnalyticsScreen from '@screens/admin/DepartmentsAnalyticsScreen';
import SecurityAnalyticsScreen from '@screens/admin/SecurityAnalyticsScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  NotificationSettings: undefined;
  ActiveSessions: undefined;
  PasskeyManagement: undefined;
  About: undefined;
  Analytics: undefined;
  MetricsAnalytics: undefined;
  PerformanceAnalytics: undefined;
  DepartmentsAnalytics: undefined;
  SecurityAnalytics: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

const ProfileNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="ActiveSessions" component={ActiveSessionsScreen} />
      <Stack.Screen name="PasskeyManagement" component={PasskeyManagementScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsHubScreen} />
      <Stack.Screen name="MetricsAnalytics" component={MetricsAnalyticsScreen} />
      <Stack.Screen name="PerformanceAnalytics" component={PerformanceAnalyticsScreen} />
      <Stack.Screen name="DepartmentsAnalytics" component={DepartmentsAnalyticsScreen} />
      <Stack.Screen name="SecurityAnalytics" component={SecurityAnalyticsScreen} />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;
