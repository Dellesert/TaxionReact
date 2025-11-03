/**
 * Auth Navigator
 * Навигация для неавторизованных пользователей
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '@screens/auth/LoginScreen';
import TwoFactorScreen from '@screens/auth/TwoFactorScreen';
import AcceptInvitationScreen from '@screens/auth/AcceptInvitationScreen';
import ResetPasswordScreen from '@screens/auth/ResetPasswordScreen';
import ForgotPasswordScreen from '@screens/auth/ForgotPasswordScreen';

export type AuthStackParamList = {
  Login: undefined;
  TwoFactor: { email: string };
  AcceptInvitation: { token?: string };
  ResetPassword: { token: string };
  ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="TwoFactor" component={TwoFactorScreen} />
      <Stack.Screen name="AcceptInvitation" component={AcceptInvitationScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
