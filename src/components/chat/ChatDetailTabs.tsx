/**
 * Chat Detail Tabs
 * Компонент для переключения между вкладками в деталях чата
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';

export type TabType = 'participants' | 'attachments';

interface ChatDetailTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  showParticipants: boolean; // Показывать ли вкладку участников (только для групповых чатов)
}

export const ChatDetailTabs: React.FC<ChatDetailTabsProps> = ({
  activeTab,
  onTabChange,
  showParticipants,
}) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    tab: {
      // Base tab style
    },
    activeTabIndicator: {
      backgroundColor: theme.primary,
    },
    tabText: {
      color: theme.textSecondary,
    },
    activeTabText: {
      color: theme.primary,
    },
  });

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <View style={styles.tabsContainer}>
        {showParticipants && (
          <TouchableOpacity
            style={styles.tab}
            onPress={() => onTabChange('participants')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                dynamicStyles.tabText,
                activeTab === 'participants' && dynamicStyles.activeTabText,
                activeTab === 'participants' && styles.activeTabText,
              ]}
            >
              Участники
            </Text>
            {activeTab === 'participants' && (
              <View style={[styles.activeTabIndicator, dynamicStyles.activeTabIndicator]} />
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.tab}
          onPress={() => onTabChange('attachments')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.tabText,
              dynamicStyles.tabText,
              activeTab === 'attachments' && dynamicStyles.activeTabText,
              activeTab === 'attachments' && styles.activeTabText,
            ]}
          >
            Вложения
          </Text>
          {activeTab === 'attachments' && (
            <View style={[styles.activeTabIndicator, dynamicStyles.activeTabIndicator]} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});
