/**
 * Summary Carousel
 * Карусель с большими карточками сводки
 */

import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { DashboardCounts } from '../types/dashboard.types';

// Скелетон компонент
const SkeletonBox: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}> = ({ width, height, borderRadius = 8, style }) => {
  const { isDark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.ease,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? '#374151' : '#E5E7EB',
          opacity,
        },
        style,
      ]}
    />
  );
};

// Скелетон карточки
const CardSkeleton: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' },
      ]}
    >
      <View style={styles.cardTop}>
        <SkeletonBox width={56} height={56} borderRadius={16} />
        <SkeletonBox width={60} height={50} borderRadius={12} />
      </View>

      <View style={styles.cardMiddle}>
        <SkeletonBox width="70%" height={24} style={{ marginBottom: 10 }} />
        <SkeletonBox width="100%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonBox width="80%" height={16} />
      </View>

      <SkeletonBox width={140} height={40} borderRadius={12} />
    </View>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
const CARD_HEIGHT = 220;
const PAGINATION_HEIGHT = 32; // 16px marginTop + 8px dot + 8px buffer
const CONTAINER_HEIGHT = CARD_HEIGHT + PAGINATION_HEIGHT;

interface SummaryCardProps {
  counts: DashboardCounts | null;
  isLoading?: boolean;
  onPressNewTasks?: () => void;
  onPressOverdue?: () => void;
  onPressPolls?: () => void;
  onPressEvents?: () => void;
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
  onPressEvents,
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

  // Показываем скелетон при загрузке или отсутствии данных
  // Используем фиксированную высоту контейнера чтобы избежать "прыжков" контента
  if (isLoading || !counts) {
    return (
      <View style={styles.fixedHeightContainer}>
        <CardSkeleton />
      </View>
    );
  }

  const hasNewTasks = counts.new_tasks_count > 0;
  const hasOverdue = counts.overdue_tasks_count > 0;
  const hasPolls = counts.pending_polls_count > 0;
  const hasEvents = counts.today_events_count > 0;
  const hasAnyData = hasNewTasks || hasOverdue || hasPolls || hasEvents;

  // Все выполнено
  if (!hasAnyData) {
    return (
      <View style={styles.fixedHeightContainer}>
        <View style={[styles.successCard, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
          <View style={[styles.successIcon, { backgroundColor: isDark ? '#10b98120' : '#d1fae5' }]}>
            <Ionicons name="checkmark-circle" size={40} color="#10B981" />
          </View>
          <Text style={[styles.successTitle, { color: isDark ? '#6ee7b7' : '#065f46' }]}>
            Нет новых событий!
          </Text>
          <Text style={[styles.successSubtitle, { color: isDark ? '#6ee7b7AA' : '#065f46AA' }]}>
            Здесь будут появляться сведения о новых задачах, опросах, графиков
          </Text>
        </View>
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

  // События на сегодня
  if (hasEvents) {
    cardsData.push({
      key: 'events',
      count: counts.today_events_count,
      title: 'События на сегодня',
      description: counts.today_events_count === 1
        ? 'Запланировано событие на сегодня'
        : `${counts.today_events_count} событий запланировано на сегодня`,
      actionText: 'Открыть календарь',
      icon: 'calendar',
      color: '#10B981',
      bgColor: '#ecfdf5',
      bgColorDark: '#064e3b',
      onPress: onPressEvents,
    });
  }

  // Если только одна карточка - показываем без индикаторов
  if (cardsData.length === 1) {
    const { key: _, ...cardProps } = cardsData[0];
    return (
      <View style={styles.fixedHeightContainer}>
        <CardItem
          {...cardProps}
          isDark={isDark}
        />
      </View>
    );
  }

  return (
    <View style={[styles.carouselContainer, { height: CONTAINER_HEIGHT }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {cardsData.map(({ key, ...cardProps }) => (
          <View key={key} style={styles.cardWrapper}>
            <CardItem
              {...cardProps}
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
  // Фиксированный контейнер для всех состояний - предотвращает "прыжки"
  fixedHeightContainer: {
    height: CONTAINER_HEIGHT,
    justifyContent: 'flex-start',
  },
  // Carousel
  carouselContainer: {
    marginHorizontal: -HORIZONTAL_PADDING,
  },
  cardWrapper: {
    width: SCREEN_WIDTH,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  // Card
  card: {
    width: CARD_WIDTH,
    borderRadius: 24,
    padding: 20,
    height: CARD_HEIGHT,
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
