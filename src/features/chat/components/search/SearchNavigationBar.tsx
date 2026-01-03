/**
 * SearchNavigationBar Component
 * Панель навигации по результатам поиска (отображается внизу экрана)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface SearchNavigationBarProps {
  total: number;
  currentIndex: number;
  isLoading: boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  searchQuery: string;
}

export const SearchNavigationBar: React.FC<SearchNavigationBarProps> = ({
  total,
  currentIndex,
  isLoading,
  onNavigatePrev,
  onNavigateNext,
  searchQuery,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const isQueryTooShort = searchQuery.length > 0 && searchQuery.length < 3;
  const hasResults = total > 0;
  const canNavigatePrev = hasResults && currentIndex > 0;
  const canNavigateNext = hasResults && currentIndex < total - 1;

  const getStatusText = () => {
    if (isQueryTooShort) {
      return 'Минимум 3 символа';
    }
    if (isLoading) {
      return 'Поиск...';
    }
    if (searchQuery.length === 0) {
      return 'Введите запрос';
    }
    if (hasResults) {
      return `${currentIndex + 1} из ${total}`;
    }
    return 'Ничего не найдено';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary, paddingBottom: insets.bottom }]}>
      <View style={styles.statusContainer}>
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
        ) : null}
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
          {getStatusText()}
        </Text>
      </View>

      {/* Кнопки инвертированы: chevron-up вызывает Next, chevron-down вызывает Prev
          потому что список сообщений инвертирован (новые сообщения внизу) */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity
          onPress={onNavigateNext}
          style={[
            styles.navButton,
            { backgroundColor: theme.backgroundTertiary },
            !canNavigateNext && styles.navButtonDisabled,
          ]}
          disabled={!canNavigateNext}
        >
          <Ionicons
            name="chevron-up"
            size={24}
            color={canNavigateNext ? theme.text : theme.textTertiary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNavigatePrev}
          style={[
            styles.navButton,
            { backgroundColor: theme.backgroundTertiary },
            !canNavigatePrev && styles.navButtonDisabled,
          ]}
          disabled={!canNavigatePrev}
        >
          <Ionicons
            name="chevron-down"
            size={24}
            color={canNavigatePrev ? theme.text : theme.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 72,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  loader: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 15,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
});
