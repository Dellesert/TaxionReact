/**
 * Zoom Settings Content
 * Контент для настройки масштаба интерфейса (только Electron)
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { getElectronAPI } from '@shared/utils/platform';

const ZOOM_STEPS = [0.8, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15];
const DEFAULT_ZOOM = 1.0;

const ZoomSettingsContent: React.FC = () => {
  const { theme } = useTheme();
  const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_ZOOM);
  const [trackWidth, setTrackWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const thumbAnim = useRef(new Animated.Value(0)).current;
  const trackRef = useRef<View>(null);
  const trackLeftRef = useRef(0);
  const trackWidthRef = useRef(0);
  const currentZoomRef = useRef(currentZoom);

  currentZoomRef.current = currentZoom;
  trackWidthRef.current = trackWidth;

  const stepToPosition = (step: number) => {
    const index = ZOOM_STEPS.indexOf(step);
    if (index === -1 || trackWidth === 0) return 0;
    return (index / (ZOOM_STEPS.length - 1)) * trackWidth;
  };

  const positionToStep = (x: number, width: number): number => {
    if (width === 0) return DEFAULT_ZOOM;
    const ratio = Math.max(0, Math.min(1, x / width));
    const index = Math.round(ratio * (ZOOM_STEPS.length - 1));
    return ZOOM_STEPS[index];
  };

  useEffect(() => {
    const electron = getElectronAPI();
    if (electron?.zoom) {
      electron.zoom.getLevel().then((level: number | string) => {
        // Backward compat: convert old named levels
        if (typeof level === 'string') {
          const map: Record<string, number> = { small: 0.9, standard: 1.0, large: 1.1 };
          level = map[level] ?? DEFAULT_ZOOM;
        }
        // Snap to nearest step
        const nearest = ZOOM_STEPS.reduce((prev, curr) =>
          Math.abs(curr - (level as number)) < Math.abs(prev - (level as number)) ? curr : prev
        );
        setCurrentZoom(nearest);
      });
    }
  }, []);

  useEffect(() => {
    if (trackWidth > 0) {
      Animated.spring(thumbAnim, {
        toValue: stepToPosition(currentZoom),
        useNativeDriver: false,
        friction: 8,
        tension: 120,
      }).start();
    }
  }, [currentZoom, trackWidth]);

  const handleZoomChange = async (factor: number) => {
    const electron = getElectronAPI();
    if (electron?.zoom) {
      const result = await electron.zoom.setLevel(factor);
      if (result.success) {
        setCurrentZoom(factor);
      }
    }
  };

  const handleZoomChangeRef = useRef(handleZoomChange);
  handleZoomChangeRef.current = handleZoomChange;

  const measureTrack = () => {
    // @ts-ignore - web-only: get DOM node bounding rect
    const node = trackRef.current;
    if (node) {
      node.measure?.((x: number, y: number, width: number, height: number, pageX: number) => {
        trackLeftRef.current = pageX;
      });
      // Fallback for web: use getBoundingClientRect
      // @ts-ignore
      const domNode = node._nativeTag || node;
      if (typeof domNode?.getBoundingClientRect === 'function') {
        const rect = domNode.getBoundingClientRect();
        trackLeftRef.current = rect.left;
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const localX = e.pageX - trackLeftRef.current;
      const step = positionToStep(localX, trackWidthRef.current);
      if (step !== currentZoomRef.current) {
        handleZoomChangeRef.current(step);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleTrackMouseDown = (e: any) => {
    measureTrack();
    const nativeEvent = e.nativeEvent || e;
    const pageX = nativeEvent.pageX;
    const localX = pageX - trackLeftRef.current;
    const step = positionToStep(localX, trackWidthRef.current);
    handleZoomChangeRef.current(step);
    setIsDragging(true);
  };

  const onTrackLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
    setTimeout(measureTrack, 50);
  };

  const isDefault = currentZoom === DEFAULT_ZOOM;

  const styles = StyleSheet.create({
    container: {
      gap: 24,
    },
    sliderCard: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sliderLabel: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      color: theme.textSecondary,
      marginBottom: 16,
      textAlign: 'center',
    },
    sliderContainer: {
      paddingHorizontal: 8,
    },
    trackHitArea: {
      paddingVertical: 12,
      // @ts-ignore
      cursor: isDragging ? 'grabbing' : 'pointer',
    },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.border,
      justifyContent: 'center',
    },
    activeTrack: {
      position: 'absolute',
      left: 0,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.primary,
    },
    thumb: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.primary,
      marginLeft: -12,
      top: -9,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
      // @ts-ignore
      cursor: isDragging ? 'grabbing' : 'grab',
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingHorizontal: 0,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.border,
    },
    dotActive: {
      backgroundColor: theme.primary,
    },
    labelsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    labelSmall: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    labelLarge: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    resetButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: isDefault ? theme.card : theme.primary + '12',
      borderWidth: 1,
      borderColor: isDefault ? theme.border : theme.primary + '30',
      opacity: isDefault ? 0.5 : 1,
      gap: 6,
      // @ts-ignore
      cursor: 'pointer',
    },
    resetText: {
      fontSize: 13,
      fontWeight: '700',
      color: isDefault ? theme.textSecondary : theme.primary,
    },
  });

  // Calculate the position for the active track end
  const defaultIndex = ZOOM_STEPS.indexOf(DEFAULT_ZOOM);
  const currentIndex = ZOOM_STEPS.indexOf(currentZoom);

  const activeTrackLeft = trackWidth > 0
    ? Math.min(stepToPosition(DEFAULT_ZOOM), stepToPosition(currentZoom))
    : 0;
  const activeTrackWidth = trackWidth > 0
    ? Math.abs(stepToPosition(currentZoom) - stepToPosition(DEFAULT_ZOOM))
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.sliderCard}>
        <Text style={styles.sliderLabel}>
          {currentZoom === 0.8 && 'Самый мелкий'}
          {currentZoom === 0.9 && 'Мелкий'}
          {currentZoom === 0.95 && 'Уменьшенный'}
          {currentZoom === 1.0 && 'Стандартный'}
          {currentZoom === 1.05 && 'Увеличенный'}
          {currentZoom === 1.1 && 'Крупный'}
          {currentZoom === 1.15 && 'Самый крупный'}
        </Text>

        <View style={styles.sliderContainer}>
          {/* @ts-ignore - web onMouseDown */}
          <View
            style={styles.trackHitArea}
            onMouseDown={handleTrackMouseDown}
          >
            <View
              ref={trackRef}
              style={styles.track}
              onLayout={onTrackLayout}
            >
              {trackWidth > 0 && (
                <>
                  <View
                    style={[
                      styles.activeTrack,
                      { left: activeTrackLeft, width: activeTrackWidth },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.thumb,
                      { left: thumbAnim },
                    ]}
                  />
                </>
              )}
            </View>
          </View>

          <View style={styles.dotsContainer}>
            {ZOOM_STEPS.map((step, i) => (
              <TouchableOpacity
                key={step}
                onPress={() => handleZoomChange(step)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View
                  style={[
                    styles.dot,
                    (currentIndex >= defaultIndex
                      ? i >= defaultIndex && i <= currentIndex
                      : i >= currentIndex && i <= defaultIndex) && styles.dotActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.labelsContainer}>
            <Ionicons name="remove" size={16} color={theme.textSecondary} />
            <Ionicons name="add" size={16} color={theme.textSecondary} />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => handleZoomChange(DEFAULT_ZOOM)}
        disabled={isDefault}
        activeOpacity={0.7}
      >
        <Ionicons
          name="refresh-outline"
          size={18}
          color={isDefault ? theme.textSecondary : theme.primary}
        />
        <Text style={styles.resetText}>Сбросить</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ZoomSettingsContent;
