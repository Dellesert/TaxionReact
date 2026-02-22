/**
 * GlobalSearchDropdown Component
 * Dropdown с результатами глобального поиска, сгруппированными по категориям
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
// @ts-ignore - react-dom types not installed
import ReactDOM from 'react-dom';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import {
  SearchCategory,
  SearchResult,
  SearchEntityType,
  TaskSearchMetadata,
  PollSearchMetadata,
  ChatSearchMetadata,
  MessageSearchMetadata,
  EventSearchMetadata,
  ScheduleSearchMetadata,
} from '@shared/types/globalSearch.types';
import { DesktopNavigationParams } from '@shared/contexts/DesktopNavigationContext';

interface GlobalSearchDropdownProps {
  visible: boolean;
  onClose: () => void;
  results: SearchCategory[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  query: string;
  onLoadMore: (type: SearchEntityType) => void;
  anchorPosition: { x: number; y: number };
  desktopNavigateToTab: (tab: string, params?: DesktopNavigationParams) => void;
  activeRoute?: string;
}

const CATEGORY_CONFIG: Record<SearchEntityType, {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tab: string;
}> = {
  task:     { icon: 'checkbox-outline',        label: 'Задачи',    tab: 'Tasks' },
  poll:     { icon: 'bar-chart-outline',       label: 'Опросы',    tab: 'Polls' },
  chat:     { icon: 'chatbubbles-outline',     label: 'Чаты',      tab: 'Chats' },
  message:  { icon: 'chatbox-outline',         label: 'Сообщения', tab: 'Chats' },
  event:    { icon: 'calendar-outline',        label: 'События',   tab: 'Calendar' },
  schedule: { icon: 'time-outline',            label: 'Графики',   tab: 'Schedules' },
};

const renderHighlightedText = (html: string, textColor: string, highlightBg: string, highlightColor: string) => {
  const parts = html.split(/(<mark>|<\/mark>)/);
  let isHighlighted = false;

  return (
    <Text numberOfLines={2} style={{ color: textColor, fontSize: 13, lineHeight: 18 }}>
      {parts.map((part, i) => {
        if (part === '<mark>') { isHighlighted = true; return null; }
        if (part === '</mark>') { isHighlighted = false; return null; }
        if (!part) return null;
        return (
          <Text
            key={i}
            style={isHighlighted ? {
              backgroundColor: highlightBg,
              color: highlightColor,
              fontWeight: '600',
              borderRadius: 2,
            } : undefined}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
};

export const GlobalSearchDropdown: React.FC<GlobalSearchDropdownProps> = ({
  visible,
  onClose,
  results,
  totalCount,
  isLoading,
  isLoadingMore,
  error,
  query: _query,
  onLoadMore,
  anchorPosition,
  desktopNavigateToTab,
  activeRoute,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Закрытие по Escape
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  const handleResultPress = useCallback((result: SearchResult) => {
    onClose();

    const config = CATEGORY_CONFIG[result.entity_type];
    const tab = config.tab;
    let params: DesktopNavigationParams = {};

    switch (result.entity_type) {
      case 'task':
        params = { taskId: result.entity_id };
        break;
      case 'poll':
        params = { pollId: result.entity_id };
        break;
      case 'chat':
        params = { chatId: result.entity_id };
        break;
      case 'message': {
        const msgMeta = result.metadata as MessageSearchMetadata;
        params = { chatId: msgMeta.chat_id, messageId: result.entity_id };
        break;
      }
      case 'event':
        params = { eventId: result.entity_id };
        break;
      case 'schedule':
        params = { scheduleId: result.entity_id };
        break;
    }

    setTimeout(() => {
      desktopNavigateToTab(tab, params);
    }, 200);
  }, [onClose, desktopNavigateToTab]);

  const renderMetadataBadges = useCallback((result: SearchResult) => {
    const badges: { label: string; color: string; bg: string }[] = [];

    switch (result.entity_type) {
      case 'task': {
        const meta = result.metadata as TaskSearchMetadata;
        if (meta.status) {
          const statusColors: Record<string, { color: string; bg: string }> = {
            'in_progress': { color: '#3B82F6', bg: '#3B82F620' },
            'completed': { color: '#22C55E', bg: '#22C55E20' },
            'pending': { color: '#F59E0B', bg: '#F59E0B20' },
            'cancelled': { color: '#EF4444', bg: '#EF444420' },
          };
          const sc = statusColors[meta.status] || { color: theme.textTertiary, bg: theme.backgroundTertiary };
          const statusLabels: Record<string, string> = {
            'in_progress': 'В работе',
            'completed': 'Выполнена',
            'pending': 'Ожидает',
            'cancelled': 'Отменена',
          };
          badges.push({ label: statusLabels[meta.status] || meta.status, ...sc });
        }
        if (meta.priority) {
          const priorityColors: Record<string, { color: string; bg: string }> = {
            'high': { color: '#EF4444', bg: '#EF444420' },
            'medium': { color: '#F59E0B', bg: '#F59E0B20' },
            'low': { color: '#22C55E', bg: '#22C55E20' },
          };
          const pc = priorityColors[meta.priority] || { color: theme.textTertiary, bg: theme.backgroundTertiary };
          const priorityLabels: Record<string, string> = {
            'high': 'Высокий',
            'medium': 'Средний',
            'low': 'Низкий',
          };
          badges.push({ label: priorityLabels[meta.priority] || meta.priority, ...pc });
        }
        break;
      }
      case 'poll': {
        const meta = result.metadata as PollSearchMetadata;
        if (meta.status) {
          const statusColors: Record<string, { color: string; bg: string }> = {
            'active': { color: '#22C55E', bg: '#22C55E20' },
            'closed': { color: '#EF4444', bg: '#EF444420' },
            'draft': { color: '#F59E0B', bg: '#F59E0B20' },
          };
          const sc = statusColors[meta.status] || { color: theme.textTertiary, bg: theme.backgroundTertiary };
          const statusLabels: Record<string, string> = {
            'active': 'Активен',
            'closed': 'Закрыт',
            'draft': 'Черновик',
          };
          badges.push({ label: statusLabels[meta.status] || meta.status, ...sc });
        }
        break;
      }
      case 'chat': {
        const meta = result.metadata as ChatSearchMetadata;
        if (meta.type) {
          const typeLabels: Record<string, string> = {
            'private': 'Личный',
            'group': 'Групповой',
            'channel': 'Канал',
          };
          badges.push({
            label: typeLabels[meta.type] || meta.type,
            color: theme.textTertiary,
            bg: theme.backgroundTertiary,
          });
        }
        break;
      }
      case 'event': {
        const meta = result.metadata as EventSearchMetadata;
        if (meta.type) {
          badges.push({
            label: meta.type,
            color: theme.textTertiary,
            bg: theme.backgroundTertiary,
          });
        }
        if (meta.location) {
          badges.push({
            label: meta.location,
            color: theme.textTertiary,
            bg: theme.backgroundTertiary,
          });
        }
        break;
      }
      case 'schedule': {
        const meta = result.metadata as ScheduleSearchMetadata;
        if (meta.is_active !== undefined) {
          badges.push({
            label: meta.is_active ? 'Активен' : 'Неактивен',
            color: meta.is_active ? '#22C55E' : '#EF4444',
            bg: meta.is_active ? '#22C55E20' : '#EF444420',
          });
        }
        break;
      }
    }

    if (badges.length === 0) return null;

    return (
      <View style={styles.badgesContainer}>
        {badges.map((badge, i) => (
          <View key={i} style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        ))}
      </View>
    );
  }, [theme]);

  const renderResultItem = useCallback((result: SearchResult) => {
    return (
      <TouchableOpacity
        key={`${result.entity_type}-${result.entity_id}`}
        style={styles.resultItem}
        onPress={() => handleResultPress(result)}
        activeOpacity={0.7}
        // @ts-ignore - Web-only hover
        onMouseEnter={(e: any) => {
          if (e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
          }
        }}
        onMouseLeave={(e: any) => {
          if (e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Text numberOfLines={1} style={[styles.resultTitle, { color: theme.text }]}>
          {result.title}
        </Text>
        {result.content ? (
          <View style={styles.resultContentContainer}>
            {renderHighlightedText(
              result.content,
              theme.textSecondary,
              (theme.warning || '#F59E0B') + '40',
              theme.text,
            )}
          </View>
        ) : null}
        {renderMetadataBadges(result)}
      </TouchableOpacity>
    );
  }, [theme, handleResultPress, renderMetadataBadges]);

  const renderCategory = useCallback((category: SearchCategory) => {
    const config = CATEGORY_CONFIG[category.type];
    if (!config) return null;

    return (
      <View key={category.type} style={[styles.categorySection, { borderBottomColor: theme.border }]}>
        {/* Category header */}
        <View style={styles.categoryHeader}>
          <Ionicons name={config.icon} size={16} color={theme.primary} />
          <Text style={[styles.categoryLabel, { color: theme.text }]}>{config.label}</Text>
          <Text style={[styles.categoryCount, { color: theme.textTertiary }]}>({category.total})</Text>
        </View>

        {/* Results */}
        {(category.results || []).map(renderResultItem)}

        {/* Show more */}
        {category.has_more && (
          <TouchableOpacity
            style={styles.showMoreButton}
            onPress={() => onLoadMore(category.type)}
            activeOpacity={0.7}
          >
            <Text style={[styles.showMoreText, { color: theme.primary }]}>
              Показать ещё {category.total - (category.results || []).length}
            </Text>
            {isLoadingMore && (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginLeft: 6 }} />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }, [theme, renderResultItem, onLoadMore, isLoadingMore]);

  // Сортируем категории: сначала те, что соответствуют текущей открытой странице
  const sortedResults = useMemo(() => {
    const sortedResults = results || [];
    if (!activeRoute || sortedResults.length <= 1) return sortedResults;
    return [...sortedResults].sort((a, b) => {
      const aMatch = CATEGORY_CONFIG[a.type]?.tab === activeRoute ? 0 : 1;
      const bMatch = CATEGORY_CONFIG[b.type]?.tab === activeRoute ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [results, activeRoute]);

  if (!visible) return null;

  const dropdownStyle = {
    left: anchorPosition.x,
    top: anchorPosition.y + 8,
    zIndex: 10000,
  };

  const renderContent = () => {
    if (isLoading && sortedResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Поиск...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.text }]}>Ошибка поиска</Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>{error}</Text>
        </View>
      );
    }

    if (sortedResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={40} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.text }]}>Ничего не найдено</Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Попробуйте изменить запрос
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator>
        {sortedResults.map(renderCategory)}
      </ScrollView>
    );
  };

  const dropdownContent = (
    <>
      {/* Overlay */}
      <TouchableOpacity
        style={[styles.overlay, Platform.OS === 'web' && { position: 'fixed' as any }]}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Dropdown */}
      <Animated.View
        style={[
          styles.dropdown,
          dropdownStyle as any,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            // @ts-ignore - Web-only style
            position: Platform.OS === 'web' ? 'fixed' : 'absolute',
            ...Platform.select({
              web: {
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
              },
              default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.24,
                shadowRadius: 16,
                elevation: 12,
              },
            }),
          } as any,
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="search" size={16} color={theme.textSecondary} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Результаты поиска
            </Text>
            {totalCount > 0 && (
              <Text style={[styles.headerCount, { color: theme.textTertiary }]}>
                ({totalCount})
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {renderContent()}
      </Animated.View>
    </>
  );

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return ReactDOM.createPortal(dropdownContent, document.body);
  }

  return dropdownContent;
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  dropdown: {
    width: 440,
    maxHeight: 500,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerCount: {
    fontSize: 13,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    cursor: 'pointer',
  },
  scrollView: {
    maxHeight: 450,
  },
  categorySection: {
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 6,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryCount: {
    fontSize: 12,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    // @ts-ignore - Web-only styles
    cursor: 'pointer',
    // @ts-ignore
    transition: 'background-color 0.1s ease',
    borderRadius: 4,
    marginHorizontal: 4,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  resultContentContainer: {
    marginBottom: 4,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    // @ts-ignore
    cursor: 'pointer',
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    minHeight: 160,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});
