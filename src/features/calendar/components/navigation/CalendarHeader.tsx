import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NotificationBell } from '@shared/components/common/NotificationBell';
import { useTheme } from '@shared/hooks/useTheme';
import { MobileViewMode } from '../../hooks/useMobileCalendarState';

interface CalendarHeaderProps {
  searchQuery?: string;
  onAddPress: () => void;
  onSearchChange?: (text: string) => void;
  onSearchClear?: () => void;
  onFilterPress?: () => void;
  hasActiveFilters?: boolean;
  isDesktop?: boolean;
  // Mobile view mode props
  viewMode?: MobileViewMode;
  onViewModeToggle?: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  searchQuery = '',
  onAddPress,
  onSearchChange,
  onSearchClear,
  onFilterPress,
  hasActiveFilters = false,
  isDesktop = false,
  viewMode,
  onViewModeToggle,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Pre-calculate top padding to prevent layout shift on iOS
  // Only apply safe area top padding on native platforms
  const topPadding = Platform.OS !== 'web' ? insets.top : 0;

  // Desktop header content
  if (isDesktop) {
    // Check if running in Electron
    const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

    return (
      <View style={[styles.desktopHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.desktopHeaderContent}>
          {/* Left side - Title */}
          <View style={styles.desktopLeft}>
            <Text style={[styles.desktopTitle, { color: theme.text }]}>Календарь</Text>
          </View>

          {/* Center - Search (только для браузера, не Electron) */}
          {!isElectron && onSearchChange && (
            <View style={styles.desktopCenter}>
              <View style={[styles.desktopSearchContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.desktopSearchInput, { color: theme.text }]}
                  placeholder="Поиск событий..."
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={onSearchChange}
                />
                {searchQuery.length > 0 && onSearchClear && (
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
            {onFilterPress && (
              <TouchableOpacity
                onPress={onFilterPress}
                style={[styles.desktopButton, { borderColor: theme.border }]}
              >
                <Ionicons name="filter" size={20} color={theme.text} />
                <Text style={[styles.desktopButtonText, { color: theme.text }]}>
                  Фильтры
                </Text>
                {hasActiveFilters && (
                  <View style={[styles.desktopFilterIndicator, { backgroundColor: theme.primary }]} />
                )}
              </TouchableOpacity>
            )}

            {/* Create Event Button */}
            <TouchableOpacity
              onPress={onAddPress}
              style={[styles.desktopButtonPrimary, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.desktopButtonPrimaryText}>Создать событие</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Mobile header content
  return (
    <View style={[styles.mobileHeaderContainer, { backgroundColor: theme.card, paddingTop: topPadding + 6 }]}>
      <View style={styles.container}>
        <View style={styles.left}>
          <NotificationBell />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>Календарь</Text>

        <View style={styles.rightButtons}>
          {/* View Mode Toggle Button */}
          {onViewModeToggle && (
            <TouchableOpacity onPress={onViewModeToggle} style={styles.viewToggleButton}>
              <Ionicons
                name={viewMode === 'week' ? 'calendar-outline' : 'list-outline'}
                size={24}
                color={theme.primary}
              />
            </TouchableOpacity>
          )}

          {/* Add Button */}
          <TouchableOpacity onPress={onAddPress} style={styles.addButton}>
            <Ionicons name="add" size={30} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Mobile styles
  mobileHeaderContainer: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 4,
    zIndex: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Desktop styles
  desktopHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
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
    gap: 24,
  },
  desktopLeft: {
    flexShrink: 0,
    minWidth: 100,
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
    gap: 12,
    flexShrink: 0,
  },
  desktopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    position: 'relative',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'background-color, border-color, transform',
        transitionDuration: '0.15s',
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
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  desktopFilterIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
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
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'transform, box-shadow',
        transitionDuration: '0.15s',
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
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
});
