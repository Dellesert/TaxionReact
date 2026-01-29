/**
 * About Logo Component
 * Логотип приложения для экрана "О приложении"
 */

import React from 'react';
import { View, Text, StyleSheet, Platform, Image } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface AboutLogoProps {
  appName: string;
  versionText: string;
}

export const AboutLogo: React.FC<AboutLogoProps> = ({ appName, versionText }) => {
  const { theme } = useTheme();

  const isDesktop = Platform.OS === 'web';

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: isDesktop ? 'transparent' : theme.backgroundSecondary,
      borderBottomColor: isDesktop ? 'transparent' : theme.border,
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
        <Image
          source={require('../../../../../assets/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoImage: {
    width: 60,
    height: 60,
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
