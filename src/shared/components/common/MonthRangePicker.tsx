/**
 * MonthRangePicker
 * Универсальный компонент выбора диапазона месяцев с попапом-сеткой.
 * Поддерживает кросс-годовые диапазоны, hover-превью, анимации.
 * На web/Electron рендерится через portal, на мобильных — через Modal.
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

let ReactDOM: any;
if (Platform.OS === 'web') {
  ReactDOM = require('react-dom');
}

// ─── Constants ──────────────────────────────────────────────────

const SHORT_MONTH_NAMES = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

const POPUP_WIDTH = 280;
const POPUP_GAP = 6;

// ─── Types ──────────────────────────────────────────────────────

interface MonthRangePickerProps {
  /** First day of start month, e.g. new Date(2025, 0, 1) */
  startMonth: Date;
  /** First day of end month, e.g. new Date(2025, 2, 1) */
  endMonth: Date;
  /** Fired when user completes range selection */
  onChange: (start: Date, end: Date) => void;
  /** Compact mode for titlebar usage */
  compact?: boolean;
}

type SelectionPhase = 'idle' | 'picking_end';

interface MonthId {
  year: number;
  month: number;
}

type CellState = 'range_start' | 'range_end' | 'in_range' | 'range_endpoint' | 'default';

// ─── Helpers ────────────────────────────────────────────────────

const monthToVal = (year: number, month: number) => year * 12 + month;

const formatRangeLabel = (start: Date, end: Date): string => {
  const sName = SHORT_MONTH_NAMES[start.getMonth()];
  const eName = SHORT_MONTH_NAMES[end.getMonth()];
  const sYear = start.getFullYear();
  const eYear = end.getFullYear();

  if (sYear === eYear) {
    if (start.getMonth() === end.getMonth()) {
      return `${sName} ${sYear}`;
    }
    return `${sName} — ${eName} ${sYear}`;
  }
  return `${sName} ${sYear} — ${eName} ${eYear}`;
};

// ─── Component ──────────────────────────────────────────────────

export const MonthRangePicker: React.FC<MonthRangePickerProps> = React.memo(({
  startMonth,
  endMonth,
  onChange,
  compact = false,
}) => {
  const { theme } = useTheme();
  const triggerRef = useRef<View>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);

  const [displayYear, setDisplayYear] = useState(() => startMonth.getFullYear());
  const [phase, setPhase] = useState<SelectionPhase>('idle');
  const [tempStart, setTempStart] = useState<MonthId | null>(null);
  const [hoverTarget, setHoverTarget] = useState<MonthId | null>(null);

  // ─── Label ──────────────────────────────────────────────────

  const rangeLabel = useMemo(
    () => formatRangeLabel(startMonth, endMonth),
    [startMonth, endMonth],
  );

  // ─── Popup positioning ──────────────────────────────────────

  const measureTrigger = useCallback(() => {
    if (!triggerRef.current) return;
    const node = triggerRef.current as any;

    if (Platform.OS === 'web' && node && typeof node.getBoundingClientRect === 'function') {
      const rect = node.getBoundingClientRect();
      computePosition(rect);
    } else if (Platform.OS === 'web' && node && node._nativeTag) {
      node.measure?.((_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
        computePosition({ left: pageX, top: pageY, width, height });
      });
    }
  }, []);

  const computePosition = (rect: { left: number; top: number; width: number; height: number }) => {
    const popupHeight = 310;
    const windowH = Dimensions.get('window').height;
    const windowW = Dimensions.get('window').width;

    let top = rect.top + rect.height + POPUP_GAP;
    if (top + popupHeight > windowH - 8) {
      top = rect.top - popupHeight - POPUP_GAP;
    }

    let left = rect.left;
    if (left + POPUP_WIDTH > windowW - 8) {
      left = windowW - POPUP_WIDTH - 8;
    }
    if (left < 8) left = 8;

    setPopupPosition({ top, left });
  };

  // ─── Open / Close ──────────────────────────────────────────

  const handleOpen = useCallback(() => {
    setDisplayYear(startMonth.getFullYear());
    setPhase('idle');
    setTempStart(null);
    setHoverTarget(null);
    setIsOpen(true);
  }, [startMonth]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.95);
      requestAnimationFrame(() => {
        measureTrigger();
      });
    } else if (isRendered) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 150,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsRendered(false);
        setPopupPosition(null);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (popupPosition && isOpen) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [popupPosition, isOpen]);

  // ─── Year navigation ──────────────────────────────────────

  const handlePrevYear = useCallback(() => {
    setDisplayYear((y) => y - 1);
  }, []);

  const handleNextYear = useCallback(() => {
    setDisplayYear((y) => y + 1);
  }, []);

  const handleTodayYear = useCallback(() => {
    setDisplayYear(new Date().getFullYear());
  }, []);

  const isCurrentDisplayYear = displayYear === new Date().getFullYear();

  // ─── Month selection ──────────────────────────────────────

  const handleMonthPress = useCallback((monthIndex: number) => {
    if (phase === 'idle') {
      setTempStart({ year: displayYear, month: monthIndex });
      setPhase('picking_end');
    } else {
      const endId: MonthId = { year: displayYear, month: monthIndex };
      const startVal = monthToVal(tempStart!.year, tempStart!.month);
      const endVal = monthToVal(endId.year, endId.month);

      const [finalStart, finalEnd] = startVal <= endVal
        ? [tempStart!, endId]
        : [endId, tempStart!];

      onChange(
        new Date(finalStart.year, finalStart.month, 1),
        new Date(finalEnd.year, finalEnd.month, 1),
      );

      setPhase('idle');
      setTempStart(null);
      setHoverTarget(null);
      handleClose();
    }
  }, [phase, displayYear, tempStart, onChange, handleClose]);

  // ─── Cell state ───────────────────────────────────────────

  const getCellState = useCallback((cellMonth: number): CellState => {
    const cellVal = monthToVal(displayYear, cellMonth);

    if (phase === 'picking_end' && tempStart) {
      const startVal = monthToVal(tempStart.year, tempStart.month);
      if (cellVal === startVal) return 'range_start';

      if (hoverTarget) {
        const hoverVal = monthToVal(hoverTarget.year, hoverTarget.month);
        const [lo, hi] = startVal <= hoverVal ? [startVal, hoverVal] : [hoverVal, startVal];
        if (cellVal === lo || cellVal === hi) return 'range_endpoint';
        if (cellVal > lo && cellVal < hi) return 'in_range';
      }
      return 'default';
    }

    const commitStartVal = monthToVal(startMonth.getFullYear(), startMonth.getMonth());
    const commitEndVal = monthToVal(endMonth.getFullYear(), endMonth.getMonth());
    if (cellVal === commitStartVal || cellVal === commitEndVal) return 'range_endpoint';
    if (cellVal > commitStartVal && cellVal < commitEndVal) return 'in_range';
    return 'default';
  }, [displayYear, phase, tempStart, hoverTarget, startMonth, endMonth]);

  // ─── Render trigger ───────────────────────────────────────

  const trigger = (
    <View ref={triggerRef}>
      <TouchableOpacity
        onPress={handleOpen}
        style={[
          compact ? styles.triggerCompact : styles.trigger,
          { backgroundColor: theme.card, shadowColor: theme.shadow },
        ]}
        activeOpacity={0.7}
      >
        <Text style={[compact ? styles.triggerTextCompact : styles.triggerText, { color: theme.text }]}>
          {rangeLabel}
        </Text>
        <Ionicons
          name="chevron-down"
          size={compact ? 12 : 14}
          color={theme.textSecondary}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>
    </View>
  );

  // ─── Render month grid (shared between web popup and mobile modal) ───

  const renderMonthGrid = () => (
    <>
      {/* Year navigation */}
      <View style={styles.yearNav}>
        <TouchableOpacity
          onPress={handlePrevYear}
          style={[styles.yearNavArrow, { backgroundColor: theme.backgroundTertiary }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={16} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isCurrentDisplayYear ? undefined : handleTodayYear}
          disabled={isCurrentDisplayYear}
          style={styles.yearNavLabel}
          activeOpacity={isCurrentDisplayYear ? 1 : 0.6}
        >
          <Text style={[styles.yearNavText, { color: theme.text }]}>
            {displayYear}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNextYear}
          style={[styles.yearNavArrow, { backgroundColor: theme.backgroundTertiary }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={16} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Month grid 4x3 */}
      <View style={styles.grid}>
        {SHORT_MONTH_NAMES.map((name, index) => {
          const state = getCellState(index);
          const isEndpoint = state === 'range_start' || state === 'range_end' || state === 'range_endpoint';
          const isInRange = state === 'in_range';

          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleMonthPress(index)}
              activeOpacity={0.7}
              style={[
                styles.cell,
                isEndpoint && { backgroundColor: theme.primary },
                isInRange && { backgroundColor: theme.primaryLight },
              ]}
              {...(Platform.OS === 'web' ? {
                // @ts-ignore
                onMouseEnter: (e: any) => {
                  if (phase === 'picking_end') {
                    setHoverTarget({ year: displayYear, month: index });
                  }
                  if (!isEndpoint && !isInRange && e.currentTarget?.style) {
                    e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
                  }
                },
                // @ts-ignore
                onMouseLeave: (e: any) => {
                  if (phase === 'picking_end') {
                    setHoverTarget(null);
                  }
                  if (!isEndpoint && !isInRange && e.currentTarget?.style) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                },
              } : {})}
            >
              <Text
                style={[
                  styles.cellText,
                  { color: isEndpoint ? '#FFFFFF' : theme.text },
                ]}
              >
                {name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Phase hint */}
      {phase === 'picking_end' && (
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Выберите конец диапазона
        </Text>
      )}
    </>
  );

  // ─── Mobile modal ─────────────────────────────────────────

  if (Platform.OS !== 'web') {
    return (
      <>
        {trigger}
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={handleClose}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleClose}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}}
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.card,
                  shadowColor: '#000',
                },
              ]}
            >
              {renderMonthGrid()}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }

  // ─── Web popup ─────────────────────────────────────────

  if (!isRendered || !popupPosition) {
    return trigger;
  }

  const popupContent = (
    <>
      <View
        style={styles.clickCatcher}
        // @ts-ignore — web-only event
        onClick={handleClose}
      />

      <Animated.View
        style={[
          styles.popup,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            top: popupPosition.top,
            left: popupPosition.left,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {renderMonthGrid()}
      </Animated.View>
    </>
  );

  return (
    <>
      {trigger}
      {typeof document !== 'undefined' && ReactDOM?.createPortal
        ? ReactDOM.createPortal(popupContent, document.body)
        : popupContent
      }
    </>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        cursor: 'pointer',
      } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  triggerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    // @ts-ignore
    cursor: 'pointer',
  },
  triggerText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  triggerTextCompact: {
    fontSize: 13,
    fontWeight: '600',
  },
  clickCatcher: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9998,
  },
  popup: {
    position: 'fixed' as any,
    zIndex: 9999,
    width: POPUP_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
      } as any,
      default: {},
    }),
  },
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  yearNavArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  } as any,
  yearNavLabel: {
    alignItems: 'center',
    paddingHorizontal: 16,
    // @ts-ignore
    cursor: 'pointer',
  } as any,
  yearNavText: {
    fontSize: 16,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '25%' as any,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  cellText: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: POPUP_WIDTH,
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});
