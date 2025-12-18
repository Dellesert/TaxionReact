import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Animated as RNAnimated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { NotificationBell } from '@shared/components/common/NotificationBell';
import { PollFilter } from '../../utils/pollListHelpers';
import { PollViewControlGroup, ViewMode } from '../common/PollViewControlGroup';

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
  isDesktop?: boolean;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
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
  isDesktop = false,
  viewMode = 'grid',
  onViewModeChange,
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

  // Desktop header content
  if (isDesktop) {
    // Check if running in Electron
    const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

    return (
      <View style={[styles.desktopHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.desktopHeaderContent}>
          {/* Left side - View Control Group */}
          <View style={styles.desktopLeft}>
            <PollViewControlGroup
              viewMode={viewMode}
              onViewModeChange={(mode) => onViewModeChange?.(mode)}
            />
          </View>

          {/* Center - Search (только для браузера, не Electron) */}
          {!isElectron && (
            <View style={styles.desktopCenter}>
              <View style={[styles.desktopSearchContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.desktopSearchInput, { color: theme.text }]}
                  placeholder="Поиск опросов..."
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={onSearchChange}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={onSearchClear} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Right side - Actions */}
          <View style={styles.desktopRight}>
            {/* Filter Button */}
            <View ref={filterButtonRef} collapsable={false}>
              <TouchableOpacity
                onPress={handleFilterPress}
                style={[styles.desktopButton, { borderColor: theme.border }]}
              >
                <Ionicons name="filter" size={18} color={theme.text} />
                <Text style={[styles.desktopButtonText, { color: theme.text }]}>
                  Фильтры
                </Text>
                {filter !== 'active' && <View style={[styles.desktopFilterIndicator, { backgroundColor: theme.primary }]} />}
              </TouchableOpacity>
            </View>

            {/* Create Poll Button */}
            {canCreatePoll && (
              <TouchableOpacity
                onPress={onCreatePress}
                style={[styles.desktopButtonPrimary, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.desktopButtonPrimaryText}>Создать опрос</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Mobile header content
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
              <TouchableOpacity onPress={onSearchToggle} style={[styles.iconButton, styles.searchButton]}>
                <Ionicons
                  name={isSearchVisible ? 'close' : 'search'}
                  size={22}
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
  // Mobile styles
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
  searchButton: {
    marginLeft: 4,
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

  // Desktop styles
  desktopHeader: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  desktopHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
    paddingVertical: 10,
    gap: 12,
    minHeight: 52,
  },
  desktopLeft: {
    flexShrink: 0,
  },
  desktopTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  desktopCenter: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -300 }], // Half of maxWidth (600/2)
    width: 600,
    maxWidth: 600,
    ...Platform.select({
      web: {
        // @ts-ignore - web only
        transform: 'translateX(-50%)',
        left: '50%',
      },
    }),
  },
  desktopSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 18,
    borderWidth: 2,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
        transitionProperty: 'border-color, box-shadow',
        transitionDuration: '0.2s',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
  },
  desktopSearchInput: {
    flex: 1,
    fontSize: 15,
    height: 44,
    ...(Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }) as any),
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'opacity',
        transitionDuration: '0.15s',
      },
    }),
  },
  desktopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  desktopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44, // Accessibility: minimum touch target
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    gap: 6,
    position: 'relative',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  desktopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  desktopFilterIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  desktopButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44, // Accessibility: minimum touch target
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  desktopButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: '#FFFFFF',
    lineHeight: 18,
  },
});
