/**
 * AdminListSkeleton Component
 * Скелетон для списка карточек (отделы, пользователи, группы) при загрузке данных
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface AdminListSkeletonProps {
  /** Количество карточек-плейсхолдеров */
  count?: number;
  /** Вариант карточки */
  variant?: 'department' | 'user' | 'group';
}

export const AdminListSkeleton: React.FC<AdminListSkeletonProps> = ({
  count = 6,
  variant = 'department',
}) => {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const line = { backgroundColor: theme.border, opacity };

  const renderUserCard = (key: number) => (
    <View key={key} style={styles.cardWrapper}>
      <View style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        {/* Avatar + info */}
        <View style={styles.userHeader}>
          <Animated.View style={[styles.avatar, line]} />
          <View style={styles.userInfo}>
            <Animated.View style={[styles.userName, line]} />
            <Animated.View style={[styles.userEmail, line]} />
            <Animated.View style={[styles.userPosition, line]} />
          </View>
        </View>
        {/* Footer */}
        <View style={styles.footer}>
          <Animated.View style={[styles.roleBadge, line]} />
          <View style={styles.actionRow}>
            <Animated.View style={[styles.actionButton, line]} />
            <Animated.View style={[styles.actionButton, line]} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderDepartmentCard = (key: number) => (
    <View key={key} style={styles.cardWrapper}>
      <View style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        {/* Icon + name */}
        <View style={styles.nameRow}>
          <Animated.View style={[styles.smallIcon, line]} />
          <Animated.View style={[styles.cardName, line]} />
        </View>
        {/* Description */}
        {key % 2 === 0 && <Animated.View style={[styles.description, line]} />}
        {/* Members count */}
        <View style={styles.nameRow}>
          <Animated.View style={[styles.tinyIcon, line]} />
          <Animated.View style={[styles.membersText, line]} />
        </View>
        {/* Actions */}
        <View style={styles.footer}>
          <View style={styles.actionRow}>
            <Animated.View style={[styles.actionButton, line]} />
            <Animated.View style={[styles.actionButton, line]} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderGroupCard = (key: number) => (
    <View key={key} style={styles.cardWrapper}>
      <View style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        {/* Icon + name */}
        <View style={styles.nameRow}>
          <Animated.View style={[styles.smallIcon, line]} />
          <Animated.View style={[styles.cardName, line]} />
        </View>
        {/* Description */}
        {key % 2 === 0 && <Animated.View style={[styles.description, line]} />}
        {/* Members count */}
        <View style={styles.nameRow}>
          <Animated.View style={[styles.tinyIcon, line]} />
          <Animated.View style={[styles.membersText, line]} />
        </View>
        {/* Actions */}
        <View style={styles.footer}>
          <View style={styles.actionRow}>
            <Animated.View style={[styles.actionButton, line]} />
            <Animated.View style={[styles.actionButton, line]} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderCard = variant === 'user' ? renderUserCard : variant === 'group' ? renderGroupCard : renderDepartmentCard;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.contentInner}>
        <View style={styles.grid}>
          {Array.from({ length: count }, (_, i) => renderCard(i))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentInner: {
    maxWidth: 1400,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  cardWrapper: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  // User card
  userHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 6,
  },
  userName: {
    height: 16,
    width: '60%',
    borderRadius: 8,
  },
  userEmail: {
    height: 14,
    width: '80%',
    borderRadius: 7,
  },
  userPosition: {
    height: 12,
    width: '45%',
    borderRadius: 6,
  },
  // Department / Group card
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  smallIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  tinyIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  cardName: {
    height: 16,
    width: '55%',
    borderRadius: 8,
  },
  description: {
    height: 14,
    width: '85%',
    borderRadius: 7,
    marginBottom: 8,
  },
  membersText: {
    height: 12,
    width: 100,
    borderRadius: 6,
  },
  // Footer / actions
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  roleBadge: {
    height: 28,
    width: 100,
    borderRadius: 10,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
  },
});
