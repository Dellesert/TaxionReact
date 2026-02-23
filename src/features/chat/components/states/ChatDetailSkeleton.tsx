/**
 * ChatDetailSkeleton Component
 * Скелетон для правой панели десктопного чата
 * (ChatDesktopHeader + сообщения + поле ввода)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const ChatDetailSkeleton: React.FC = () => {
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
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const line = {
    backgroundColor: theme.border,
    opacity,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header skeleton — повторяет ChatDesktopHeader */}
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
        <Animated.View style={[styles.headerAvatar, line]} />
        <View style={styles.headerInfo}>
          <Animated.View style={[styles.headerName, line]} />
          <Animated.View style={[styles.headerStatus, line]} />
        </View>
        <Animated.View style={[styles.headerIcon, line]} />
      </View>

      {/* Messages area skeleton */}
      <View style={styles.messages}>
        {/* Incoming message */}
        <View style={styles.messageRowLeft}>
          <Animated.View style={[styles.msgAvatar, line]} />
          <View>
            <Animated.View style={[styles.bubbleLeft, styles.bubbleLong, { backgroundColor: theme.card, borderColor: theme.border }, { opacity }]} />
            <Animated.View style={[styles.msgTime, { alignSelf: 'flex-start' }, line]} />
          </View>
        </View>

        {/* Outgoing message */}
        <View style={styles.messageRowRight}>
          <Animated.View style={[styles.bubbleRight, styles.bubbleShort, line]} />
        </View>

        {/* Incoming message */}
        <View style={styles.messageRowLeft}>
          <Animated.View style={[styles.msgAvatar, line]} />
          <View>
            <Animated.View style={[styles.bubbleLeft, styles.bubbleMedium, { backgroundColor: theme.card, borderColor: theme.border }, { opacity }]} />
          </View>
        </View>

        {/* Outgoing message — long */}
        <View style={styles.messageRowRight}>
          <View>
            <Animated.View style={[styles.bubbleRight, styles.bubbleLong, line]} />
            <Animated.View style={[styles.msgTime, { alignSelf: 'flex-end' }, line]} />
          </View>
        </View>

        {/* Incoming message */}
        <View style={styles.messageRowLeft}>
          <Animated.View style={[styles.msgAvatar, line]} />
          <View>
            <Animated.View style={[styles.bubbleLeft, styles.bubbleShort, { backgroundColor: theme.card, borderColor: theme.border }, { opacity }]} />
          </View>
        </View>

        {/* Outgoing message */}
        <View style={styles.messageRowRight}>
          <Animated.View style={[styles.bubbleRight, styles.bubbleMedium, line]} />
        </View>
      </View>

      {/* Input bar skeleton */}
      <View style={[styles.inputBar, { borderTopColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
        <Animated.View style={[styles.inputIcon, line]} />
        <Animated.View style={[styles.inputField, { backgroundColor: theme.card, borderColor: theme.border }, { opacity }]} />
        <Animated.View style={[styles.inputIcon, line]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  headerName: {
    height: 16,
    width: 120,
    borderRadius: 8,
  },
  headerStatus: {
    height: 12,
    width: 80,
    borderRadius: 6,
  },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  // Messages
  messages: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
    justifyContent: 'flex-end',
  },
  messageRowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageRowRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  bubbleLeft: {
    borderRadius: 16,
    borderWidth: 1,
    borderBottomLeftRadius: 4,
    height: 40,
  },
  bubbleRight: {
    borderRadius: 16,
    borderBottomRightRadius: 4,
    height: 40,
  },
  bubbleShort: {
    width: 120,
  },
  bubbleMedium: {
    width: 200,
  },
  bubbleLong: {
    width: 280,
  },
  msgTime: {
    height: 10,
    width: 36,
    borderRadius: 5,
    marginTop: 4,
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  inputIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  inputField: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
});
