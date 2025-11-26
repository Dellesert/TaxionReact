import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { NotificationBell } from '@shared/components/common/NotificationBell';
import { PollFilter } from '../utils/pollListHelpers';

interface PollListHeaderProps {
  filter: PollFilter;
  searchQuery: string;
  isSearchVisible: boolean;
  canCreatePoll: boolean;
  searchAnimation: RNAnimated.Value;
  onSearchToggle: () => void;
  onSearchChange: (text: string) => void;
  onSearchClear: () => void;
  onFilterPress: () => void;
  onCreatePress: () => void;
  onFilterButtonLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
}

export const PollListHeader: React.FC<PollListHeaderProps> = ({
  filter,
  searchQuery,
  isSearchVisible,
  canCreatePoll,
  searchAnimation,
  onSearchToggle,
  onSearchChange,
  onSearchClear,
  onFilterPress,
  onCreatePress,
  onFilterButtonLayout,
}) => {
  const { theme } = useTheme();
  const filterButtonRef = React.useRef<View>(null);

  const handleFilterPress = () => {
    if (onFilterButtonLayout && filterButtonRef.current) {
      filterButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        onFilterButtonLayout({ x: pageX, y: pageY, width, height });
      });
    }
    onFilterPress();
  };

  return (
    <ScreenHeader
      title="Опросы"
      customContent={
        <>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <NotificationBell />
            </View>

            <Text style={[styles.headerTitle, { color: theme.text }]}>Опросы</Text>

            <View style={[styles.headerRight, styles.headerActions]}>
              {/* Filter Button with indicator */}
              <View ref={filterButtonRef} collapsable={false}>
                <TouchableOpacity onPress={handleFilterPress} style={styles.iconButton}>
                  <Ionicons name="filter" size={24} color={theme.error} />
                  {filter !== 'active' && <View style={[styles.filterIndicator, { backgroundColor: theme.primary }]} />}
                </TouchableOpacity>
              </View>

              {/* Search Button */}
              <TouchableOpacity onPress={onSearchToggle} style={styles.iconButton}>
                <Ionicons
                  name={isSearchVisible ? 'close' : 'search'}
                  size={24}
                  color={theme.error}
                />
              </TouchableOpacity>

              {/* Add Button */}
              {canCreatePoll && (
                <TouchableOpacity onPress={onCreatePress} style={styles.iconButton}>
                  <Ionicons name="add" size={30} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Animated Search Input */}
          <RNAnimated.View
            style={[
              styles.animatedSearchContainer,
              {
                height: searchAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 48],
                }),
                opacity: searchAnimation,
                marginBottom: searchAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 12],
                }),
              },
            ]}
          >
            <View
              style={[
                styles.searchContainer,
                { backgroundColor: theme.backgroundTertiary },
              ]}
            >
              <Ionicons name="search" size={20} color={theme.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Поиск..."
                placeholderTextColor={theme.inputPlaceholder}
                value={searchQuery}
                onChangeText={onSearchChange}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={onSearchClear}>
                  <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          </RNAnimated.View>
        </>
      }
    />
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    width: 100,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 100,
    justifyContent: 'flex-end',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    paddingHorizontal: 4,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  animatedSearchContainer: {
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
});
