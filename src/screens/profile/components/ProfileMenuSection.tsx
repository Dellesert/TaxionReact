import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';

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
      marginBottom: 16,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: isDark ? 0 : 1,
      borderColor: isDark ? 'transparent' : '#E5E7EB',
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.backgroundSecondary,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: '700',
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
