import React from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { AbsenceCard } from './AbsenceCard';
import type { Absence } from '../types/absence.types';

interface AbsenceListProps {
  absences: Absence[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onItemPress?: (absence: Absence) => void;
  emptyMessage?: string;
  ListHeaderComponent?: React.ReactElement;
}

export const AbsenceList: React.FC<AbsenceListProps> = ({
  absences,
  isLoading,
  isRefreshing,
  onRefresh,
  onLoadMore,
  onItemPress,
  emptyMessage = 'Нет отсутствий',
  ListHeaderComponent,
}) => {
  const { theme } = useTheme();

  const renderItem = ({ item }: { item: Absence }) => (
    <AbsenceCard
      absence={item}
      onPress={onItemPress ? () => onItemPress(item) : undefined}
    />
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundTertiary }]}>
          <Ionicons name="calendar-outline" size={40} color={theme.textTertiary} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>
          {emptyMessage}
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
          Нажмите + чтобы добавить отсутствие
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || absences.length === 0) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  };

  return (
    <FlatList
      data={absences}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={[
        styles.listContent,
        absences.length === 0 && styles.emptyListContent,
      ]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing ?? false}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        ) : undefined
      }
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  emptyListContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
