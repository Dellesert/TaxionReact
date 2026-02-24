import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface ProfileMenuSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Menu section container with title and optional description
 */
export const ProfileMenuSection: React.FC<ProfileMenuSectionProps> = ({ title, description, children }) => {
  const { theme, isDark } = useTheme();

  const dynamicStyles = StyleSheet.create({
    section: {
      backgroundColor: theme.backgroundSecondary,
      marginBottom: 8,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
      ...Platform.select({
        web: {
          // @ts-ignore
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.08,
          shadowRadius: 8,
          elevation: 3,
        },
      }),
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.backgroundSecondary,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
      color: theme.textSecondary,
      letterSpacing: 0.5,
    },
    sectionDescription: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 4,
      lineHeight: 16,
    },
  });

  return (
    <View style={dynamicStyles.section}>
      <View style={dynamicStyles.sectionHeader}>
        <Text style={dynamicStyles.sectionTitle}>{title}</Text>
        {description && <Text style={dynamicStyles.sectionDescription}>{description}</Text>}
      </View>
      {children}
    </View>
  );
};
