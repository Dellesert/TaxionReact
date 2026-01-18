/**
 * Dashboard Section
 * Секция с заголовком и списком элементов
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface DashboardSectionProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  count?: number;
  emptyText: string;
  onSeeAll?: () => void;
  children?: React.ReactNode;
  isEmpty?: boolean;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  icon,
  iconColor,
  count,
  emptyText,
  onSeeAll,
  children,
  isEmpty = false,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {count !== undefined && count > 0 && (
            <View style={[styles.countBadge, { backgroundColor: iconColor + '20' }]}>
              <Text style={[styles.countText, { color: iconColor }]}>{count}</Text>
            </View>
          )}
        </View>
        {onSeeAll && !isEmpty && (
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={onSeeAll}
            activeOpacity={0.7}
          >
            <Text style={[styles.seeAllText, { color: theme.primary }]}>Все</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isEmpty ? (
        <View style={[styles.emptyContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons name={icon} size={32} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
            {emptyText}
          </Text>
        </View>
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingLeft: 8,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    // Контент будет иметь свои отступы
  },
  emptyContainer: {
    marginHorizontal: 16,
    paddingVertical: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default DashboardSection;
