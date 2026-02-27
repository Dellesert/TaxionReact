import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { Theme } from '@shared/constants/theme.constants';
import { DataTableSkeleton } from './DataTableSkeleton';

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
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Extract a comparable value for sorting. Required when `sortable` is true. */
  sortValue?: (item: T) => string | number;
}

export interface DataTablePaginationProps {
  /** Current page number (1-based) */
  currentPage: number;
  /** Total number of items on the server */
  totalItems: number;
  /** Items per page */
  pageSize: number;
  /** Called when user navigates to a different page */
  onPageChange: (page: number) => void;
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
  refreshControl?: React.ReactElement<any>;
  /** Content rendered after all rows inside the ScrollView */
  renderAfterRows?: React.ReactNode;
  /** Override the outer card container style */
  containerStyle?: ViewStyle;
  /** Custom row number renderer. Overrides default sequential numbering. */
  getRowNumber?: (item: T, index: number) => string | number;
  /** Server-side pagination configuration. When provided, pagination controls
   *  are rendered in the footer and row numbering accounts for page offset. */
  pagination?: DataTablePaginationProps;
}

type SortDirection = 'asc' | 'desc';
interface SortState {
  columnKey: string;
  direction: SortDirection;
}

// ─── Row Sub-Component (memoized, per-row hover state) ───────────

interface DataTableRowProps<T> {
  item: T;
  rowNumber: string | number;
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

// ─── Pagination Helpers ──────────────────────────────────────────

function getVisiblePages(
  currentPage: number,
  totalPages: number,
): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (currentPage > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push('ellipsis');
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

// ─── Pagination Footer Sub-Component ─────────────────────────────

interface PaginationFooterProps {
  pagination: DataTablePaginationProps;
  theme: Theme;
  isDark: boolean;
}

function PaginationFooterInner({
  pagination,
  theme,
  isDark,
}: PaginationFooterProps) {
  const { currentPage, totalItems, pageSize, onPageChange } = pagination;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const visiblePages = getVisiblePages(currentPage, totalPages);

  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <View style={[styles.paginationFooter, { borderColor: theme.border }]}>
      <Text style={[styles.paginationInfo, { color: theme.textSecondary }]}>
        Всего: {totalItems}
      </Text>

      {totalPages > 1 && (
        <View style={styles.paginationControls}>
          {/* Previous page */}
          <TouchableOpacity
            style={[styles.navButton, isFirstPage && { opacity: 0.3 }]}
            onPress={() => !isFirstPage && onPageChange(currentPage - 1)}
            activeOpacity={isFirstPage ? 1 : 0.6}
            disabled={isFirstPage}
          >
            <Ionicons
              name="chevron-back"
              size={16}
              color={theme.textSecondary}
            />
          </TouchableOpacity>

          {/* Page numbers */}
          {visiblePages.map((page, idx) =>
            page === 'ellipsis' ? (
              <View key={`ellipsis-${idx}`} style={styles.pageEllipsis}>
                <Text
                  style={[
                    styles.pageButtonText,
                    { color: theme.textSecondary },
                  ]}
                >
                  ...
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                key={page}
                style={[
                  styles.pageButton,
                  page === currentPage && {
                    backgroundColor: theme.primary,
                  },
                  page !== currentPage &&
                    (isDark
                      ? { backgroundColor: 'rgba(255,255,255,0.06)' }
                      : { backgroundColor: 'rgba(0,0,0,0.04)' }),
                ]}
                onPress={() => page !== currentPage && onPageChange(page)}
                activeOpacity={page === currentPage ? 1 : 0.6}
              >
                <Text
                  style={[
                    styles.pageButtonText,
                    {
                      color:
                        page === currentPage ? '#FFFFFF' : theme.text,
                    },
                  ]}
                >
                  {page}
                </Text>
              </TouchableOpacity>
            ),
          )}

          {/* Next page */}
          <TouchableOpacity
            style={[styles.navButton, isLastPage && { opacity: 0.3 }]}
            onPress={() => !isLastPage && onPageChange(currentPage + 1)}
            activeOpacity={isLastPage ? 1 : 0.6}
            disabled={isLastPage}
          >
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.paginationInfo, { color: theme.textSecondary }]}>
        Страница {currentPage} из {totalPages}
      </Text>
    </View>
  );
}

const PaginationFooter = React.memo(PaginationFooterInner);

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
  getRowNumber,
  refreshControl,
  renderAfterRows,
  containerStyle,
  pagination,
}: DataTableProps<T>) {
  const { theme, isDark } = useTheme();
  const [sort, setSort] = useState<SortState | null>(null);

  const handleHeaderPress = (col: DataTableColumn<T>) => {
    if (!col.sortable || !col.sortValue) return;
    setSort((prev) =>
      prev?.columnKey === col.key
        ? prev.direction === 'asc'
          ? { columnKey: col.key, direction: 'desc' }
          : null
        : { columnKey: col.key, direction: 'asc' },
    );
  };

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.columnKey);
    if (!col?.sortValue) return data;
    const getValue = col.sortValue;
    const dir = sort.direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [data, sort, columns]);

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
        {columns.map((col) => {
          const isSorted = sort?.columnKey === col.key;
          const content = (
            <View style={styles.headerCell}>
              <Text
                style={[
                  styles.headerText,
                  { color: isSorted ? theme.primary : theme.textSecondary },
                ]}
              >
                {col.title}
              </Text>
              {isSorted && (
                <Ionicons
                  name={sort.direction === 'asc' ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={theme.primary}
                  style={{ marginLeft: 2 }}
                />
              )}
            </View>
          );

          return col.sortable ? (
            <TouchableOpacity
              key={col.key}
              style={[
                col.flex != null ? { flex: col.flex } : undefined,
                col.width != null ? { width: col.width } : undefined,
                col.minWidth != null ? { minWidth: col.minWidth } : undefined,
              ]}
              activeOpacity={0.6}
              onPress={() => handleHeaderPress(col)}
            >
              {content}
            </TouchableOpacity>
          ) : (
            <View
              key={col.key}
              style={[
                col.flex != null ? { flex: col.flex } : undefined,
                col.width != null ? { width: col.width } : undefined,
                col.minWidth != null ? { minWidth: col.minWidth } : undefined,
              ]}
            >
              {content}
            </View>
          );
        })}
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
            <DataTableSkeleton columns={columns} />
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
            {sortedData.map((item, index) => {
              const key = keyExtractor(item, index);
              const rowStyle = getRowStyle?.(item);
              const rowNumber = getRowNumber
                ? getRowNumber(item, index)
                : pagination
                  ? (pagination.currentPage - 1) * pagination.pageSize + index + 1
                  : index + 1;
              return (
                <DataTableRow<T>
                  key={key}
                  item={item}
                  rowNumber={rowNumber}
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

      {/* Footer with total count or pagination */}
      {data.length > 0 && (
        pagination ? (
          <PaginationFooter pagination={pagination} theme={theme} isDark={isDark} />
        ) : (
          <View style={[styles.footerRow, { borderColor: theme.border }]}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Всего: {data.length}
            </Text>
          </View>
        )
      )}
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
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  paginationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    flexWrap: 'wrap',
    gap: 8,
  },
  paginationInfo: {
    fontSize: 13,
    fontWeight: '500',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageButton: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore - web only
          cursor: 'pointer',
          transitionProperty: 'background-color',
          transitionDuration: '0.15s',
        }
      : {}),
  },
  pageButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pageEllipsis: {
    minWidth: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore - web only
          cursor: 'pointer',
        }
      : {}),
  },
});
