import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { ChatFilter } from '../../utils/chatHelpers';

interface ChatListTabsProps {
  activeFilter: ChatFilter;
  onFilterChange: (filter: ChatFilter) => void;
  tabContainerWidth: number;
  currentTabIndex: Animated.SharedValue<number>;
  onLayout: (event: any) => void;
}

export const ChatListTabs: React.FC<ChatListTabsProps> = ({
  activeFilter,
  onFilterChange,
  tabContainerWidth,
  currentTabIndex,
  onLayout,
}) => {
  const { theme } = useTheme();
  const isWideScreen = useIsWideScreen();
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;
  const isElectronDesktop = isElectron && isWideScreen;

  /**
   * Animated style for tab indicator
   */
  const tabIndicatorStyle = useAnimatedStyle(() => {
    'worklet';
    const progress = currentTabIndex.value;
    const clampedProgress = Math.max(0, Math.min(3, progress));

    const containerWidth = tabContainerWidth;
    const tabWidth = containerWidth / 4;
    const offset = tabWidth * clampedProgress;

    return {
      width: tabWidth,
      transform: [{ translateX: offset }],
    };
  }, [tabContainerWidth]);

  return (
    <View
      style={[
        styles.container,
        { borderTopColor: theme.border, borderBottomColor: theme.border },
        // Hide top border on Electron desktop (header controls are in TitleBar)
        isElectronDesktop && { borderTopWidth: 0, marginTop: 0 },
      ]}
      onLayout={onLayout}
    >
      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => onFilterChange('all')}
      >
        <Text
          style={[
            styles.filterText,
            { color: activeFilter === 'all' ? theme.primary : theme.textSecondary },
          ]}
        >
          Все
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => onFilterChange('private')}
      >
        <Text
          style={[
            styles.filterText,
            { color: activeFilter === 'private' ? theme.primary : theme.textSecondary },
          ]}
        >
          Чаты
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => onFilterChange('group')}
      >
        <Text
          style={[
            styles.filterText,
            { color: activeFilter === 'group' ? theme.primary : theme.textSecondary },
          ]}
        >
          Группы
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.filterTab}
        onPress={() => onFilterChange('favorite')}
      >
        <Text
          style={[
            styles.filterText,
            { color: activeFilter === 'favorite' ? theme.primary : theme.textSecondary },
          ]}
        >
          Избранное
        </Text>
      </TouchableOpacity>

      {/* Animated indicator */}
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
    marginTop: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderBottomWidth: 0,
    position: 'relative',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    fontSize: 14,
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
