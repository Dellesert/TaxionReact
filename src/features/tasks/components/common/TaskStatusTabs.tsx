import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import type { StatusTab, TotalsByStatus } from '../../hooks/useTaskListData';
import { STATUS_TABS } from '../../utils/taskListHelpers';

interface TaskStatusTabsProps {
  activeTab: StatusTab;
  totals: TotalsByStatus;
  onTabChange: (tab: StatusTab) => void;
  isLoading?: boolean;
}

export const TaskStatusTabs: React.FC<TaskStatusTabsProps> = React.memo(({
  activeTab,
  totals,
  onTabChange,
  isLoading = false,
}) => {
  const { theme } = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  const isNarrowScreen = screenWidth < 380;

  return (
    <View style={[styles.tabsContainer, { borderTopColor: theme.border }]}>
      {STATUS_TABS.map((tab) => {
        const count = totals[tab.key];
        const isActive = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              isActive && { ...styles.tabActive, borderBottomColor: tab.color },
            ]}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              {/* Show label on active tab or all tabs on wider screens */}
              {(isActive || !isNarrowScreen) && (
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isActive ? tab.color : theme.textSecondary,
                      fontWeight: isActive ? '700' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              )}

              {/* Count badge - hide during initial loading to prevent jumping */}
              {!isLoading && count > 0 && (
                <View
                  style={[
                    styles.tabCountContainer,
                    {
                      backgroundColor: isActive ? tab.color : theme.backgroundTertiary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabCount,
                      {
                        color: isActive ? '#FFFFFF' : theme.textTertiary,
                      },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 4,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderBottomWidth: 0,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: 'transparent',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabCountContainer: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabCount: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },
});
