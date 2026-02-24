import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { Theme } from '@shared/constants/theme.constants';

// ─── Public Types ────────────────────────────────────────────────

export interface DataTableColumn<T> {
  /** Unique key used for React key prop */
  key: string;
  /** Column header text (rendered uppercased automatically) */
  title: string;
  /** Flex value for column width. Mutually exclusive with `width`. */
  flex?: number;
  /** Fixed width in px. Mutually exclusive with `flex`. */
  width?: number;
  /** Minimum width in px (useful when flex is set) */
  minWidth?: number;
  /** Render function for each cell */
  render: (item: T, theme: Theme, isDark: boolean) => React.ReactNode;
}

export interface DataTableProps<T> {
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Data array to render as rows */
  data: T[];
  /** Unique key extractor for each row */
  keyExtractor: (item: T, index: number) => string;
  /** Called when a row is pressed */
  onRowPress?: (item: T) => void;
  /** When true, shows loading state instead of rows */
  isLoading?: boolean;
  /** Custom loading component (replaces default ActivityIndicator) */
  loadingComponent?: React.ReactNode;
  /** Ionicons icon name for empty state */
  emptyIcon?: string;
  /** Title text for empty state */
  emptyTitle?: string;
  /** Subtitle text for empty state */
  emptySubtitle?: string;
  /** Custom empty state component (overrides icon/title/subtitle) */
  emptyComponent?: React.ReactNode;
  /** Content rendered above the table header row (e.g. year/month picker) */
  headerContent?: React.ReactNode;
  /** Return additional styles for a row */
  getRowStyle?: (item: T) => ViewStyle | undefined;
  /** Pull-to-refresh control element */
  refreshControl?: React.ReactElement;
  /** Content rendered after all rows inside the ScrollView */
  renderAfterRows?: React.ReactNode;
  /** Override the outer card container style */
  containerStyle?: ViewStyle;
}

// ─── Row Sub-Component (memoized, per-row hover state) ───────────

interface DataTableRowProps<T> {
  item: T;
  rowNumber: number;
  columns: DataTableColumn<T>[];
  onPress?: (item: T) => void;
  rowStyle?: ViewStyle;
  theme: Theme;
  isDark: boolean;
}

function DataTableRowInner<T>({
  item,
  rowNumber,
  columns,
  onPress,
  rowStyle,
  theme,
  isDark,
}: DataTableRowProps<T>) {
  const [isHovered, setIsHovered] = useState(false);

  const cardBg = isDark ? theme.card : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { borderColor: theme.border, backgroundColor: cardBg },
        isHovered && { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' },
        rowStyle,
      ]}
      onPress={onPress ? () => onPress(item) : undefined}
      activeOpacity={onPress ? 0.7 : 1}
      // @ts-ignore - web-only props
      onMouseEnter={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
      onMouseLeave={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
    >
      <View style={[styles.cell, { width: 40, minWidth: 40 }]}>
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
          {rowNumber}
        </Text>
      </View>
      {columns.map((col) => (
        <View
          key={col.key}
          style={[
            styles.cell,
            col.flex != null ? { flex: col.flex } : undefined,
            col.width != null ? { width: col.width } : undefined,
            col.minWidth != null ? { minWidth: col.minWidth } : undefined,
          ]}
        >
          {col.render(item, theme, isDark)}
        </View>
      ))}
    </TouchableOpacity>
  );
}

const DataTableRow = React.memo(DataTableRowInner) as typeof DataTableRowInner;

// ─── Main DataTable Component ────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowPress,
  isLoading,
  loadingComponent,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  emptyComponent,
  headerContent,
  getRowStyle,
  refreshControl,
  renderAfterRows,
  containerStyle,
}: DataTableProps<T>) {
  const { theme, isDark } = useTheme();

  const cardBg = isDark ? theme.card : '#FFFFFF';

  return (
    <View
      style={[
        styles.tableContainer,
        { borderColor: theme.border, backgroundColor: cardBg },
        containerStyle,
      ]}
    >
      {/* Card header slot (year/month picker, etc.) */}
      {headerContent}

      {/* Table header row */}
      <View style={[styles.headerRow, { borderColor: theme.border }]}>
        <Text
          style={[
            styles.headerText,
            { color: theme.textSecondary, width: 40, minWidth: 40 },
          ]}
        >
          #
        </Text>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={[
              styles.headerText,
              { color: theme.textSecondary },
              col.flex != null ? { flex: col.flex } : undefined,
              col.width != null ? { width: col.width } : undefined,
              col.minWidth != null ? { minWidth: col.minWidth } : undefined,
            ]}
          >
            {col.title}
          </Text>
        ))}
      </View>

      {/* Table body */}
      <ScrollView
        style={[styles.bodyContainer, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        {isLoading && data.length === 0 ? (
          loadingComponent ?? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )
        ) : data.length === 0 ? (
          emptyComponent ?? (
            <View style={styles.emptyContainer}>
              {emptyIcon && (
                <Ionicons
                  name={emptyIcon as any}
                  size={64}
                  color={theme.border}
                  style={styles.emptyIcon}
                />
              )}
              {emptyTitle && (
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {emptyTitle}
                </Text>
              )}
              {emptySubtitle && (
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  {emptySubtitle}
                </Text>
              )}
            </View>
          )
        ) : (
          <>
            {data.map((item, index) => {
              const key = keyExtractor(item, index);
              const rowStyle = getRowStyle?.(item);
              return (
                <DataTableRow<T>
                  key={key}
                  item={item}
                  rowNumber={index + 1}
                  columns={columns}
                  onPress={onRowPress}
                  rowStyle={rowStyle}
                  theme={theme}
                  isDark={isDark}
                />
              );
            })}
            {renderAfterRows}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tableContainer: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore - web only
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  bodyContainer: {
    flex: 1,
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore - web only
          cursor: 'pointer',
          transitionProperty: 'background-color',
          transitionDuration: '0.2s',
        }
      : {}),
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
