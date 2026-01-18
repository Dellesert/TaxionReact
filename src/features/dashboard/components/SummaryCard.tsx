/**
 * Summary Carousel
 * Карусель с большими карточками сводки
 */

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { DashboardCounts } from '../types/dashboard.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;

interface SummaryCardProps {
  counts: DashboardCounts | null;
  isLoading?: boolean;
  onPressNewTasks?: () => void;
  onPressOverdue?: () => void;
  onPressPolls?: () => void;
}

interface CardData {
  key: string;
  count: number;
  title: string;
  description: string;
  actionText: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  bgColorDark: string;
  onPress?: () => void;
}

interface CardItemProps extends Omit<CardData, 'key'> {
  isDark: boolean;
}

const CardItem: React.FC<CardItemProps> = ({
  count,
  title,
  description,
  actionText,
  icon,
  color,
  bgColor,
  bgColorDark,
  onPress,
  isDark,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: isDark ? bgColorDark : bgColor },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: color + '25' }]}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
        <Text style={[styles.cardCount, { color }]}>
          {count}
        </Text>
      </View>

      <View style={styles.cardMiddle}>
        <Text style={[styles.cardTitle, { color }]}>
          {title}
        </Text>
        <Text style={[styles.cardDescription, { color: isDark ? color + 'CC' : color + '99' }]}>
          {description}
        </Text>
      </View>

      <View style={[styles.cardAction, { backgroundColor: color + '20' }]}>
        <Text style={[styles.cardActionText, { color }]}>
          {actionText}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={color} />
      </View>
    </TouchableOpacity>
  );
};

export const SummaryCard: React.FC<SummaryCardProps> = ({
  counts,
  isLoading,
  onPressNewTasks,
  onPressOverdue,
  onPressPolls,
}) => {
  const { theme, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (!counts) {
    return null;
  }

  const hasNewTasks = counts.new_tasks_count > 0;
  const hasOverdue = counts.overdue_tasks_count > 0;
  const hasPolls = counts.pending_polls_count > 0;
  const hasAnyData = hasNewTasks || hasOverdue || hasPolls;

  // Все выполнено
  if (!hasAnyData) {
    return (
      <View style={[styles.successCard, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
        <View style={[styles.successIcon, { backgroundColor: isDark ? '#10b98120' : '#d1fae5' }]}>
          <Ionicons name="checkmark-circle" size={40} color="#10B981" />
        </View>
        <Text style={[styles.successTitle, { color: isDark ? '#6ee7b7' : '#065f46' }]}>
          Все задачи выполнены!
        </Text>
        <Text style={[styles.successSubtitle, { color: isDark ? '#6ee7b7AA' : '#065f46AA' }]}>
          Нет просроченных задач, новых заданий и активных опросов
        </Text>
      </View>
    );
  }

  const cardsData: CardData[] = [];

  // Просроченные (первыми, если есть)
  if (hasOverdue) {
    cardsData.push({
      key: 'overdue',
      count: counts.overdue_tasks_count,
      title: 'Просроченные задачи',
      description: counts.overdue_tasks_count === 1
        ? 'Есть задача с истекшим сроком. Требуется срочное внимание!'
        : `${counts.overdue_tasks_count} задач с истекшим сроком. Требуется срочное внимание!`,
      actionText: 'Посмотреть задачи',
      icon: 'warning',
      color: '#EF4444',
      bgColor: '#fef2f2',
      bgColorDark: '#450a0a',
      onPress: onPressOverdue,
    });
  }

  // Новые задачи
  if (hasNewTasks) {
    cardsData.push({
      key: 'new',
      count: counts.new_tasks_count,
      title: 'Новые задачи',
      description: counts.new_tasks_count === 1
        ? 'Поступила новая задача, ожидающая вашего рассмотрения'
        : `Поступило ${counts.new_tasks_count} новых задач, ожидающих рассмотрения`,
      actionText: 'Открыть задачи',
      icon: 'document-text',
      color: '#3B82F6',
      bgColor: '#eff6ff',
      bgColorDark: '#172554',
      onPress: onPressNewTasks,
    });
  }

  // Опросы
  if (hasPolls) {
    cardsData.push({
      key: 'polls',
      count: counts.pending_polls_count,
      title: 'Активные опросы',
      description: counts.pending_polls_count === 1
        ? 'Есть опрос, в котором вы еще не приняли участие'
        : `${counts.pending_polls_count} опросов ожидают вашего голоса`,
      actionText: 'Перейти к опросам',
      icon: 'chatbox-ellipses',
      color: '#8B5CF6',
      bgColor: '#f5f3ff',
      bgColorDark: '#2e1065',
      onPress: onPressPolls,
    });
  }

  // Если только одна карточка - показываем без индикаторов
  if (cardsData.length === 1) {
    const card = cardsData[0];
    return (
      <View style={styles.singleCardContainer}>
        <CardItem
          {...card}
          isDark={isDark}
        />
      </View>
    );
  }

  return (
    <View style={styles.carouselContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {cardsData.map((card) => (
          <View key={card.key} style={styles.cardWrapper}>
            <CardItem
              {...card}
              isDark={isDark}
            />
          </View>
        ))}
      </ScrollView>

      {/* Индикаторы (точки) */}
      <View style={styles.pagination}>
        {cardsData.map((card, index) => (
          <TouchableOpacity
            key={card.key}
            onPress={() => scrollToIndex(index)}
            style={[
              styles.dot,
              {
                backgroundColor: index === activeIndex
                  ? card.color
                  : isDark ? theme.border : '#D1D5DB',
                width: index === activeIndex ? 24 : 8,
              },
            ]}
            activeOpacity={0.7}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Carousel
  carouselContainer: {
    marginHorizontal: -HORIZONTAL_PADDING,
  },
  cardWrapper: {
    width: SCREEN_WIDTH,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  singleCardContainer: {},
  // Card
  card: {
    width: CARD_WIDTH,
    borderRadius: 24,
    padding: 20,
    minHeight: 200,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCount: {
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 60,
  },
  cardMiddle: {
    marginVertical: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  cardActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Pagination
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  // Success state
  successCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default SummaryCard;
