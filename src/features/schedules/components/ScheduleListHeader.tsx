import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

interface ScheduleListHeaderProps {
  canCreate: boolean;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onSearchClear: () => void;
  onCreatePress: () => void;
  isDesktop?: boolean;
  onGoBack?: () => void;
  // Month picker props for desktop
  selectedMonth?: Date;
  onMonthChange?: (date: Date) => void;
}

export const ScheduleListHeader: React.FC<ScheduleListHeaderProps> = ({
  canCreate,
  searchQuery,
  onSearchChange,
  onSearchClear,
  onCreatePress,
  isDesktop = false,
  onGoBack,
  selectedMonth,
  onMonthChange,
}) => {
  const { theme } = useTheme();

  const monthLabel = useMemo(() => {
    if (!selectedMonth) return '';
    const month = MONTH_NAMES[selectedMonth.getMonth()];
    const year = selectedMonth.getFullYear();
    return `${month} ${year}`;
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    if (!selectedMonth || !onMonthChange) return;
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    if (!selectedMonth || !onMonthChange) return;
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  // Desktop header content
  if (isDesktop) {
    // Check if running in Electron
    const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

    return (
      <View style={[styles.desktopHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.desktopHeaderContent}>
          {/* Left side - Month Picker */}
          <View style={styles.desktopLeft}>
            {selectedMonth && onMonthChange && (
              <View style={styles.monthPickerRow}>
                <TouchableOpacity
                  onPress={handlePrevMonth}
                  style={[styles.monthArrow, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <Ionicons name="chevron-back" size={18} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.monthLabel, { color: theme.text }]}>{monthLabel}</Text>
                <TouchableOpacity
                  onPress={handleNextMonth}
                  style={[styles.monthArrow, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <Ionicons name="chevron-forward" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Center - Search (only for browser, not Electron) */}
          {!isElectron && (
            <View style={styles.desktopCenter}>
              <View style={[styles.desktopSearchContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.desktopSearchInput, { color: theme.text }]}
                  placeholder="Поиск графиков..."
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
            {/* Create Schedule Button */}
            {canCreate && (
              <TouchableOpacity
                onPress={onCreatePress}
                style={[styles.desktopButtonPrimary, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.desktopButtonPrimaryText}>Создать график</Text>
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
      title="Графики работы"
      customContent={
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {onGoBack && (
              <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.headerTitle, { color: theme.text }]}>Графики работы</Text>

          <View style={[styles.headerRight, styles.headerActions]}>
            {/* Add Button */}
            {canCreate && (
              <TouchableOpacity onPress={onCreatePress} style={styles.iconButton}>
                <Ionicons name="add" size={30} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
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
  backButton: {
    padding: 8,
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
    minWidth: 200,
  },
  monthPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 120,
    textAlign: 'center',
  },
  desktopCenter: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -300 }],
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
  desktopButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
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
