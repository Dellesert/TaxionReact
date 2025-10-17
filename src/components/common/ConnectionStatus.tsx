/**
 * Connection Status Component
 * Индикатор статуса подключения WebSocket
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { websocketService } from '@services/websocket.service';

interface ConnectionStatusProps {
  compact?: boolean; // Компактный режим для отображения в header
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ compact = false }) => {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const checkStatus = () => {
      if (websocketService.isConnected()) {
        setStatus('connected');
      } else {
        setStatus('connecting');
      }
    };

    // Check status immediately
    checkStatus();

    // Check status periodically
    const interval = setInterval(checkStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fade in animation when status changes
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(status === 'connected' ? 2000 : 0),
      Animated.timing(fadeAnim, {
        toValue: status === 'connected' ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [status, fadeAnim]);

  // Don't show anything if connected (after fade out)
  if (status === 'connected' && compact) {
    return null;
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          text: 'Подключено',
          color: '#10B981',
          icon: '●',
        };
      case 'connecting':
        return {
          text: 'Подключение...',
          color: '#F59E0B',
          icon: '●',
        };
      case 'disconnected':
        return {
          text: 'Нет подключения',
          color: '#EF4444',
          icon: '●',
        };
    }
  };

  const config = getStatusConfig();

  if (compact) {
    return (
      <Animated.View style={[styles.compactContainer, { opacity: fadeAnim }]}>
        <Text style={[styles.compactIcon, { color: config.color }]}>{config.icon}</Text>
        <Text style={styles.compactText}>{config.text}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.banner, { backgroundColor: config.color, opacity: fadeAnim }]}>
      <Text style={styles.bannerText}>{config.text}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  compactIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  compactText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});
