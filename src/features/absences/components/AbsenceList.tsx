import React from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
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
  onItemEdit?: (absence: Absence) => void;
  onItemDelete?: (absence: Absence) => void;
  showActions?: boolean;
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
  onItemEdit,
  onItemDelete,
  showActions = true,
  emptyMessage = 'Нет отсутствий',
  ListHeaderComponent,
}) => {
  const { theme } = useTheme();

  const renderItem = ({ item }: { item: Absence }) => (
    <AbsenceCard
      absence={item}
      onPress={onItemPress ? () => onItemPress(item) : undefined}
      onEdit={onItemEdit ? () => onItemEdit(item) : undefined}
      onDelete={onItemDelete ? () => onItemDelete(item) : undefined}
      showActions={showActions}
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
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {emptyMessage}
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
    paddingVertical: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
