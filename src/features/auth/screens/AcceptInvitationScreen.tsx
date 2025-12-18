/**
 * Accept Invitation Screen
 * Экран активации приглашения по коду
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useInvitationValidation } from '../hooks/useInvitationValidation';
import { useInvitationAcceptance } from '../hooks/useInvitationAcceptance';
import { getStepSubtitle } from '../utils/invitationHelpers';
import { InvitationHeader } from '../components/invitation/InvitationHeader';
import { InvitationCodeStep } from '../components/invitation/InvitationCodeStep';
import { InvitationPasswordStep } from '../components/invitation/InvitationPasswordStep';
import { InvitationSuccessStep } from '../components/invitation/InvitationSuccessStep';

type AcceptInvitationScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'AcceptInvitation'>;
type AcceptInvitationScreenRouteProp = RouteProp<AuthStackParamList, 'AcceptInvitation'>;

type StepType = 'enter_code' | 'create_password' | 'success';

const AcceptInvitationScreen: React.FC = () => {
  const navigation = useNavigation<AcceptInvitationScreenNavigationProp>();
  const route = useRoute<AcceptInvitationScreenRouteProp>();
  const { showError } = useNotification();
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();

  // Получаем токен из параметров (если пришли по deep link)
  const initialToken = route.params?.token || '';

  // State
  const [step, setStep] = useState<StepType>('enter_code');
  const [invitationCode, setInvitationCode] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Custom hooks
  const { invitationData, isLoading: isValidating, validateCode, resetValidation } = useInvitationValidation();
  const { isLoading: isAccepting, acceptInvitation } = useInvitationAcceptance();

  const isLoading = isValidating || isAccepting;

  // Initialize animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Auto-validate token if provided via deep link
  useEffect(() => {
    if (initialToken && initialToken.trim()) {
      handleValidateCode();
    }
  }, [initialToken]);

  // Handlers
  const handleValidateCode = async () => {
    try {
      await validateCode(invitationCode);
      setStep('create_password');
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleAcceptInvitation = async () => {
    try {
      await acceptInvitation(invitationCode, password, confirmPassword);
      setStep('success');

      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        navigation.navigate('Login');
      }, 3000);
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleBack = () => {
    setStep('enter_code');
    setPassword('');
    setConfirmPassword('');
    resetValidation();
  };

  const handleNavigateToLogin = () => {
    navigation.navigate('Login');
  };

  // Desktop layout
  if (isWideScreen) {
    return (
      <View style={[styles.desktopContainer, { backgroundColor: theme.background }]}>
        <View
          style={[
            styles.desktopCard,
            {
              backgroundColor: theme.card,
              ...Platform.select({
                web: {
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                },
                default: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.3,
                  shadowRadius: 30,
                  elevation: 20,
                },
              }),
            },
          ]}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Header */}
            <InvitationHeader subtitle={getStepSubtitle(step)} />

            {/* Step Content */}
            {step === 'success' ? (
              <InvitationSuccessStep onNavigateToLogin={handleNavigateToLogin} />
            ) : step === 'enter_code' ? (
              <InvitationCodeStep
                code={invitationCode}
                isLoading={isLoading}
                onCodeChange={setInvitationCode}
                onContinue={handleValidateCode}
                onNavigateToLogin={handleNavigateToLogin}
              />
            ) : (
              <InvitationPasswordStep
                invitationData={invitationData}
                password={password}
                confirmPassword={confirmPassword}
                showPassword={showPassword}
                showConfirmPassword={showConfirmPassword}
                isLoading={isLoading}
                onPasswordChange={setPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
                onAccept={handleAcceptInvitation}
                onBack={handleBack}
              />
            )}
          </Animated.View>
        </View>
      </View>
    );
  }

  // Mobile layout
  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <InvitationHeader subtitle={getStepSubtitle(step)} />

          {/* Step Content */}
          {step === 'success' ? (
            <InvitationSuccessStep onNavigateToLogin={handleNavigateToLogin} />
          ) : step === 'enter_code' ? (
            <InvitationCodeStep
              code={invitationCode}
              isLoading={isLoading}
              onCodeChange={setInvitationCode}
              onContinue={handleValidateCode}
              onNavigateToLogin={handleNavigateToLogin}
            />
          ) : (
            <InvitationPasswordStep
              invitationData={invitationData}
              password={password}
              confirmPassword={confirmPassword}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              isLoading={isLoading}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              onToggleConfirmPassword={() => setShowConfirmPassword(!showConfirmPassword)}
              onAccept={handleAcceptInvitation}
              onBack={handleBack}
            />
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // Mobile styles
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  // Desktop styles
  desktopContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  desktopCard: {
    width: '100%',
    maxWidth: 550,
    borderRadius: 24,
    padding: 48,
  },
});

export default AcceptInvitationScreen;
