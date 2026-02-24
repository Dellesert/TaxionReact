/**
 * About Section Component
 * Секция с заголовком для экрана "О приложении"
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface AboutSectionProps {
  title: string;
  children: ReactNode;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ title, children }) => {
  const { theme, isDark } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary,
      borderColor: isDark ? 'transparent' : theme.borderLight,
    },
    title: {
      color: theme.textSecondary,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={styles.header}>
        <Text style={[styles.title, dynamicStyles.title]}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    ...Platform.select({
      web: {
        // @ts-ignore
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
