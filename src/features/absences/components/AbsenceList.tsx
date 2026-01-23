import React, { useMemo } from 'react';
import {
  SectionList,
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

interface AbsenceSection {
  title: string;
  data: Absence[];
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const groupAbsencesByMonth = (absences: Absence[]): AbsenceSection[] => {
  const grouped = new Map<string, Absence[]>();

  absences.forEach((absence) => {
    const date = new Date(absence.start_date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${month}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(absence);
  });

  const sections: AbsenceSection[] = [];
  grouped.forEach((data, key) => {
    const [year, month] = key.split('-').map(Number);
    const currentYear = new Date().getFullYear();
    const title = currentYear === year
      ? MONTH_NAMES[month]
      : `${MONTH_NAMES[month]} ${year}`;
    sections.push({ title, data });
  });

  return sections;
};

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

  const sections = useMemo(() => groupAbsencesByMonth(absences), [absences]);

  const renderItem = ({ item }: { item: Absence }) => (
    <AbsenceCard
      absence={item}
      onPress={onItemPress ? () => onItemPress(item) : undefined}
    />
  );

  const renderSectionHeader = ({ section }: { section: AbsenceSection }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
      <Text style={[styles.sectionHeaderText, { color: theme.textSecondary }]}>
        {section.title}
      </Text>
    </View>
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
    <SectionList
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={[
        styles.listContent,
        absences.length === 0 && styles.emptyListContent,
      ]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      stickySectionHeadersEnabled={false}
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
    paddingBottom: 0,
  },
  sectionHeader: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
