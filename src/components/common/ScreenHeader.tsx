/**
 * Universal Screen Header Component
 * Универсальный компонент заголовка экрана
 *
 * Supports:
 * - Left button (optional)
 * - Centered title
 * - Right button (optional)
 * - Custom content (for complex headers)
 * - Subtitle (optional)
 * - Divider (optional)
 */

import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

export interface ScreenHeaderProps {
  // Title
  title: string;
  subtitle?: string;

  // Left button
  leftButton?: {
    icon?: keyof typeof Ionicons.glyphMap;
    text?: string;
    onPress: () => void;
  };

  // Right button
  rightButton?: {
    icon?: keyof typeof Ionicons.glyphMap;
    text?: string;
    onPress: () => void;
  };

  // Custom content (replaces everything)
  customContent?: ReactNode;

  // Below title content (for filters, pills, etc.)
  belowTitleContent?: ReactNode;

  // Style options
  showDivider?: boolean;
  withShadow?: boolean;
  compact?: boolean;

  // Custom styles
  containerStyle?: ViewStyle;
  titleStyle?: TextStyle;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  leftButton,
  rightButton,
  customContent,
  belowTitleContent,
  showDivider = false,
  withShadow = true,
  compact = false,
  containerStyle,
  titleStyle,
}) => {
  const { theme } = useTheme();

  // If custom content provided, render it instead
  if (customContent) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.card },
          withShadow && styles.shadow,
          containerStyle,
        ]}
      >
        {customContent}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.card },
        withShadow && styles.shadow,
        compact && styles.compact,
        containerStyle,
      ]}
    >
      {/* Main header row */}
      <View style={styles.headerRow}>
        {/* Left button */}
        {leftButton ? (
          <TouchableOpacity onPress={leftButton.onPress} style={styles.sideButton}>
            {leftButton.icon ? (
              <Ionicons name={leftButton.icon} size={24} color={theme.text} />
            ) : leftButton.text ? (
              <Text style={[styles.buttonText, { color: theme.error }]}>{leftButton.text}</Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.sideButton} />
        )}

        {/* Title and subtitle */}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right button */}
        {rightButton ? (
          <TouchableOpacity onPress={rightButton.onPress} style={styles.sideButton}>
            {rightButton.icon ? (
              <Ionicons name={rightButton.icon} size={24} color={theme.primary} />
            ) : rightButton.text ? (
              <Text style={[styles.addButtonText, { color: theme.primary }]}>{rightButton.text}</Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.sideButton} />
        )}
      </View>

      {/* Below title content (filters, pills, etc.) */}
      {belowTitleContent && (
        <>
          {showDivider && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
          <View style={styles.belowContent}>{belowTitleContent}</View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 0,
    zIndex: 10,
  },
  compact: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideButton: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '400',
  },
  addButtonText: {
    fontSize: 38,
    fontWeight: '200',
    lineHeight: 38,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 6,
    opacity: 0.5,
  },
  belowContent: {
    marginTop: 0,
  },
});

export default ScreenHeader;
