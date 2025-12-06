/**
 * Admin Content Area
 * Компонент для отображения контента в админ-панели
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface AdminContentAreaProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  scrollable?: boolean;
  headerActions?: React.ReactNode;
}

export const AdminContentArea: React.FC<AdminContentAreaProps> = ({
  title,
  description,
  children,
  scrollable = true,
  headerActions,
}) => {
  const { theme, isDark } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 32,
      paddingTop: 32,
      paddingBottom: 24,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: isDark ? theme.card : '#FAFAFA',
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: description ? 6 : 0,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    description: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    headerActionsContainer: {
      marginTop: 20,
    },
    content: {
      flex: 1,
    },
    contentInner: {
      paddingHorizontal: 32,
      paddingVertical: 24,
    },
  });

  const Content = scrollable ? ScrollView : View;

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.headerText}>
          <Text style={dynamicStyles.title}>{title}</Text>
          {description && (
            <Text style={dynamicStyles.description}>{description}</Text>
          )}
        </View>
        {headerActions && (
          <View style={dynamicStyles.headerActionsContainer}>
            {headerActions}
          </View>
        )}
      </View>

      {/* Content */}
      <Content
        style={dynamicStyles.content}
        {...(scrollable && {
          contentContainerStyle: dynamicStyles.contentInner,
          showsVerticalScrollIndicator: false,
        })}
      >
        {!scrollable ? (
          <View style={dynamicStyles.contentInner}>{children}</View>
        ) : (
          children
        )}
      </Content>
    </View>
  );
};
