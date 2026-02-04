import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '@shared/hooks/useTheme';
import type { ScheduleListTab } from '../types/schedule.types';

interface ScheduleTabsProps {
  activeTab: ScheduleListTab;
  onTabChange: (tab: ScheduleListTab) => void;
  tabContainerWidth: number;
  currentTabIndex: Animated.SharedValue<number>;
  onLayout: (event: any) => void;
}

export const ScheduleTabs: React.FC<ScheduleTabsProps> = ({
  activeTab,
  onTabChange,
  tabContainerWidth,
  currentTabIndex,
  onLayout,
}) => {
  const { theme } = useTheme();

  const tabIndicatorStyle = useAnimatedStyle(() => {
    'worklet';
    const progress = currentTabIndex.value;
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const containerWidth = tabContainerWidth;
    const tabWidth = containerWidth / 2;
    const offset = tabWidth * clampedProgress;

    return {
      width: tabWidth,
      transform: [{ translateX: offset }],
    };
  }, [tabContainerWidth]);

  return (
    <View
      style={[styles.container, { borderBottomColor: theme.border }]}
      onLayout={onLayout}
    >
      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('summary')}
      >
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'summary' ? theme.primary : theme.textSecondary },
          ]}
        >
          Обзор
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => onTabChange('list')}
      >
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'list' ? theme.primary : theme.textSecondary },
          ]}
        >
          Графики
        </Text>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.tabIndicator,
          { backgroundColor: theme.primary },
          tabIndicatorStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
  },
});
