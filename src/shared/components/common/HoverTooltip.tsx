import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

let ReactDOM: any;
if (Platform.OS === 'web') {
  ReactDOM = require('react-dom');
}

interface HoverTooltipProps {
  /** Trigger element */
  children: React.ReactNode;
  /** Tooltip content (ReactNode) */
  content: React.ReactNode;
  /** Delay before showing tooltip in ms (default: 300) */
  delay?: number;
  /** Disable tooltip */
  disabled?: boolean;
}

export const HoverTooltip: React.FC<HoverTooltipProps> = ({
  children,
  content,
  delay = 300,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback((e: any) => {
    if (disabled) return;
    const target = e?.currentTarget;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (target?.getBoundingClientRect) {
        const rect = target.getBoundingClientRect();
        setPos({ top: rect.bottom + 4, left: rect.left });
      }
      setVisible(true);
    }, delay);
  }, [disabled, delay]);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
    setPos(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // On non-web platforms, just render children
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  const tooltip = visible && pos ? (
    <div
      style={{
        position: 'fixed' as const,
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        pointerEvents: 'none' as const,
      }}
    >
      <View
        style={[
          styles.tooltip,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        {content}
      </View>
    </div>
  ) : null;

  const portal = tooltip && typeof document !== 'undefined' && ReactDOM?.createPortal
    ? ReactDOM.createPortal(tooltip, document.body)
    : null;

  return (
    <View
      style={styles.wrapper}
      // @ts-ignore - web only
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {portal}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  tooltip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    maxWidth: 300,
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore - web only
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }
      : {}),
  },
});

export default HoverTooltip;
