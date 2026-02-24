/**
 * DataTableSkeleton Component
 * Скелетон для DataTable — пульсирующие строки-плейсхолдеры, повторяющие структуру колонок
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import type { DataTableColumn } from './DataTable';

interface DataTableSkeletonProps {
  /** Column definitions (used to replicate widths/flex) */
  columns: DataTableColumn<any>[];
  /** Number of skeleton rows to render */
  rowCount?: number;
}

export const DataTableSkeleton: React.FC<DataTableSkeletonProps> = ({
  columns,
  rowCount = 8,
}) => {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const line = { backgroundColor: theme.border, opacity };

  const renderRow = (rowIndex: number) => (
    <View
      key={rowIndex}
      style={[
        styles.row,
        { borderBottomColor: theme.border },
      ]}
    >
      {/* # column */}
      <View style={styles.numberCell}>
        <Animated.View style={[styles.numberBlock, line]} />
      </View>

      {/* Data columns */}
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
          <Animated.View
            style={[
              styles.cellBlock,
              { width: getCellWidth(col.key, rowIndex) },
              line,
            ]}
          />
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {Array.from({ length: rowCount }, (_, i) => renderRow(i))}
    </View>
  );
};

/** Vary placeholder widths so the skeleton looks organic */
function getCellWidth(key: string, rowIndex: number): `${number}%` {
  const widths: `${number}%`[] = ['75%', '60%', '45%', '55%', '70%', '50%', '65%', '40%'];
  const hash = (key.length + rowIndex) % widths.length;
  return widths[hash];
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  numberCell: {
    width: 40,
    minWidth: 40,
    paddingRight: 12,
  },
  numberBlock: {
    height: 14,
    width: 18,
    borderRadius: 7,
  },
  cell: {
    paddingRight: 12,
  },
  cellBlock: {
    height: 14,
    borderRadius: 7,
  },
});
