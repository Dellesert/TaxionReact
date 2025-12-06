/**
 * Profile Content Area
 * Обертка для контента настроек в desktop режиме (macOS-style)
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface ProfileContentAreaProps {
  title: string;
  description?: string;
  children: ReactNode;
  scrollable?: boolean;
  maxWidth?: number;
}

export const ProfileContentArea: React.FC<ProfileContentAreaProps> = ({
  title,
  description,
  children,
  scrollable = true,
  maxWidth = 800,
}) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      overflow: 'hidden', // Скрываем все что выходит за границы (включая headers)
    },
    header: {
      paddingHorizontal: 32,
      paddingTop: 32,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
    },
    description: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    scrollContent: {
      paddingHorizontal: 32,
      paddingTop: 24,
      paddingBottom: 100,
    },
    contentWrapper: {
      maxWidth,
      width: '100%',
      alignSelf: 'center',
      overflow: 'hidden', // Дополнительная защита от выхода контента
    },
  });

  const content = (
    <View style={dynamicStyles.contentWrapper}>
      {children}
    </View>
  );

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <Text style={dynamicStyles.title}>{title}</Text>
        {description && (
          <Text style={dynamicStyles.description}>{description}</Text>
        )}
      </View>

      {/* Content */}
      {scrollable ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={dynamicStyles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, dynamicStyles.scrollContent]}>
          {content}
        </View>
      )}
    </View>
  );
};
