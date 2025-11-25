/**
 * About Logo Component
 * Логотип приложения для экрана "О приложении"
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface AboutLogoProps {
  appName: string;
  versionText: string;
}

export const AboutLogo: React.FC<AboutLogoProps> = ({ appName, versionText }) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    logoContainer: {
      backgroundColor: theme.primary,
    },
    appName: {
      color: theme.text,
    },
    versionText: {
      color: theme.textSecondary,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.logoContainer, dynamicStyles.logoContainer]}>
        <Ionicons name="flash" size={50} color="#FFFFFF" />
      </View>
      <Text style={[styles.appName, dynamicStyles.appName]}>{appName}</Text>
      <Text style={[styles.versionText, dynamicStyles.versionText]}>{versionText}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    borderBottomWidth: 1,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  versionText: {
    fontSize: 14,
  },
});
