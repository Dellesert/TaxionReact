import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';

export type TabType = 'overview' | 'attachments' | 'comments' | 'history';

interface TaskTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  attachmentsCount?: number;
  commentsCount?: number;
  isNarrowScreen: boolean;
}

export const TaskTabs: React.FC<TaskTabsProps> = ({
  activeTab,
  onTabChange,
  attachmentsCount = 0,
  commentsCount = 0,
  isNarrowScreen,
}) => {
  const { theme } = useTheme();

  const renderBadge = (count: number, isActive: boolean) => {
    if (count === 0) return null;

    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: isActive ? theme.primary : theme.backgroundTertiary,
          },
        ]}
      >
        <Text
          style={[
            styles.badgeText,
            {
              color: isActive ? '#FFFFFF' : theme.textTertiary,
            },
          ]}
        >
          {count}
        </Text>
      </View>
    );
  };

  const renderTab = (
    key: TabType,
    icon: string,
    label: string,
    badgeCount?: number
  ) => {
    const isActive = activeTab === key;
    const iconSize = isActive ? 20 : 18;

    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.tab,
          {
            borderBottomColor: isActive ? theme.primary : 'transparent',
          },
        ]}
        onPress={() => onTabChange(key)}
      >
        <View style={styles.tabContent}>
          <Ionicons
            name={icon as any}
            size={iconSize}
            color={isActive ? theme.primary : theme.textTertiary}
          />
          {(isActive || !isNarrowScreen) && (
            <Text
              style={[
                styles.tabText,
                {
                  color: isActive ? theme.primary : theme.textTertiary,
                  fontWeight: isActive ? '700' : '600',
                },
              ]}
            >
              {label}
            </Text>
          )}
          {badgeCount !== undefined && renderBadge(badgeCount, isActive)}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderBottomColor: theme.border,
        },
      ]}
    >
      {renderTab('overview', 'information-circle-outline', 'Обзор')}
      {renderTab('attachments', 'attach-outline', 'Вложения', attachmentsCount)}
      {renderTab('comments', 'chatbubble-outline', 'Комментарии', commentsCount)}
      {renderTab('history', 'time-outline', 'История')}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 2,
    alignItems: 'center',
    borderBottomWidth: 3,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tabText: {
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
